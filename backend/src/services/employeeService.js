const User = require('../models/User');
const Lead = require('../models/Lead');
const Branch = require('../models/Branch');
const VehicleSpecialization = require('../models/VehicleSpecialization');

const { assertObjectId } = require('../utils/ids');
const { STAFF_ROLES, isSuperAdmin, isAdmin, isAnyAdmin, isHrStaff, isEmployee } = require('../utils/roles');
const { logAudit } = require('../utils/auditLogger');
const {
  normalizeVehicleSpecialization
} = require('../utils/vehicleSpecializations');
const { parseOptionalDate } = require('../utils/dates');
const { assertBranchAccess, getUserBranchId, getBranchFilter } = require('../utils/branchAccess');

const VALID_ROLES = STAFF_ROLES;
const VALID_STATUSES = ['active', 'inactive'];

const normalizeString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const normalizeEmail = (value) =>
  normalizeString(value).toLowerCase();

const normalizeEmployeeId = (value) =>
  normalizeString(value).toUpperCase();

/**
 * Get all vehicle specializations.
 */
const getVehicleSpecializations = async () => {
  const defaultSpecializations = [
    'German',
    'Korean',
    'Japanese',
    'Other'
  ];

  await Promise.all(
    defaultSpecializations.map(async (name) => {
      await VehicleSpecialization.updateOne(
        {
          name: {
            $regex: `^${name.replace(
              /[.*+?^${}()|[\]\\]/g,
              '\\$&'
            )}$`,
            $options: 'i'
          }
        },
        {
          $setOnInsert: {
            name
          }
        },
        {
          upsert: true
        }
      );
    })
  );

  return VehicleSpecialization.find({})
    .sort({ name: 1 })
    .select('_id name')
    .lean();
};

/**
 * Create a new vehicle specialization.
 */
const createVehicleSpecialization = async (name) => {
  const cleanName = normalizeString(name);

  if (!cleanName) {
    throw new Error(
      'Vehicle specialization name is required'
    );
  }

  const escapedName = cleanName.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  const existing =
    await VehicleSpecialization.findOne({
      name: {
        $regex: `^${escapedName}$`,
        $options: 'i'
      }
    });

  if (existing) {
    throw new Error(
      'Vehicle specialization already exists'
    );
  }

  const specialization =
    await VehicleSpecialization.create({
      name: cleanName
    });

  return specialization.toJSON();
};

/**
 * List employees with branch isolation & admin branch filtering
 */
const listEmployees = async (
  queryParams = {},
  currentUser
) => {
  const {
    page = 1,
    limit = 25,
    search = '',
    role,
    status,
    branchId
  } = queryParams;

  let currentPage = Number(page);
  let currentLimit = Number(limit);

  if (!Number.isFinite(currentPage) || currentPage < 1) {
    currentPage = 1;
  }

  if (!Number.isFinite(currentLimit) || currentLimit < 1) {
    currentLimit = 25;
  }

  currentLimit = Math.min(currentLimit, 100);

  const query = {};

  // Branch isolation
  if (!isAdmin(currentUser)) {
    // HR only sees employees within their branch
    const hrBranch = getUserBranchId(currentUser);
    query.branchId = hrBranch;
  } else {
    // Admin can filter by branch or view all
    if (branchId === 'unassigned') {
      query.$or = [{ branchId: null }, { branchId: { $exists: false } }];
    } else if (branchId && branchId !== 'all') {
      query.branchId = branchId;
    }
  }

  const searchText = normalizeString(search);

  if (searchText) {
    const searchConditions = [
      { name: { $regex: searchText, $options: 'i' } },
      { email: { $regex: searchText, $options: 'i' } },
      { phone: { $regex: searchText, $options: 'i' } },
      { employeeId: { $regex: searchText, $options: 'i' } },
      { branch: { $regex: searchText, $options: 'i' } },
      { position: { $regex: searchText, $options: 'i' } },
      { garageShop: { $regex: searchText, $options: 'i' } },
      {
        vehicleSpecialization: {
          $regex: searchText,
          $options: 'i'
        }
      }
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchConditions }];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  if (role) {
    if (!VALID_ROLES.includes(role)) {
      throw new Error('Invalid role');
    }
    query.role = role;
  }

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      throw new Error('Invalid staff status');
    }
    query.status = status;
  }

  const skip = (currentPage - 1) * currentLimit;

  const total = await User.countDocuments(query);

  const users = await User.find(query)
    .populate('branchId', 'name code address phone status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(currentLimit)
    .lean();

  // Count leads assigned to each employee
  const userIds = users.map((user) => user._id);

  let leadCounts = [];

  if (userIds.length > 0) {
    leadCounts = await Lead.aggregate([
      {
        $match: {
          assignedTo: { $in: userIds },
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          count: { $sum: 1 }
        }
      }
    ]);
  }

  const leadCountMap = {};

  leadCounts.forEach((item) => {
    leadCountMap[item._id.toString()] = item.count;
  });

  const enrichedUsers = users.map((user) => {
    const leadsAssigned =
      leadCountMap[user._id.toString()] || 0;

    return {
      ...user,
      leadsAssigned,
      assignedLeadsCount: leadsAssigned
    };
  });

  const totalPages =
    Math.ceil(total / currentLimit) || 1;

  return {
    employees: enrichedUsers,
    data: enrichedUsers,
    total,
    page: currentPage,
    pages: totalPages,
    pagination: {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages
    }
  };
};

const getEmployeeById = async (id, currentUser) => {
  assertObjectId(id, 'staff id');

  const user = await User.findById(id)
    .populate('branchId', 'name code address phone status')
    .lean();

  if (!user) {
    throw new Error('Employee not found');
  }

  // Branch access check for HR
  if (currentUser && !isAdmin(currentUser)) {
    assertBranchAccess(user.branchId, currentUser, 'view');
  }

  const assignedLeadsCount =
    await Lead.countDocuments({
      assignedTo: user._id,
      isDeleted: { $ne: true }
    });

  return {
    ...user,
    leadsAssigned: assignedLeadsCount,
    assignedLeadsCount
  };
};

const createEmployee = async (
  {
    name,
    email,
    password,
    role,
    status,
    phone,
    employeeId,
    idDetails,
    passportNumber,
    passportExpireDate,
    vehicleSpecialization,
    branch,
    branchId,
    position,
    garageShop
  },
  currentUser
) => {
  const cleanName = normalizeString(name);
  const cleanEmail = normalizeEmail(email);
  const cleanEmployeeId =
    normalizeEmployeeId(employeeId);

  if (!cleanName) {
    throw new Error('Name is required');
  }

  if (!cleanEmail) {
    throw new Error('Email is required');
  }

  if (!cleanEmployeeId) {
    throw new Error('Staff ID is required');
  }

  if (password !== undefined && password !== null) {
    if (String(password).length < 6) {
      throw new Error(
        'Password must be at least 6 characters long'
      );
    }
  }

  let selectedRole = role || 'employee';

  if (!VALID_ROLES.includes(selectedRole)) {
    throw new Error('Invalid role');
  }

  // Only superadmin can create superadmin accounts
  if (selectedRole === 'superadmin' && !isSuperAdmin(currentUser)) {
    const error = new Error('Only Super Admin can grant Super Admin privileges');
    error.statusCode = 403;
    throw error;
  }

  // HR cannot create admin or superadmin
  if (isHrStaff(currentUser) && (selectedRole === 'admin' || selectedRole === 'superadmin')) {
    const error = new Error('HR cannot create administrator accounts');
    error.statusCode = 403;
    throw error;
  }

  const selectedStatus = status || 'active';

  if (!VALID_STATUSES.includes(selectedStatus)) {
    throw new Error('Invalid staff status');
  }

  // Branch assignment resolution
  let finalBranchId = null;
  let finalBranchName = normalizeString(branch);

  if (isHrStaff(currentUser)) {
    // HR must assign employee to their own branch
    finalBranchId = getUserBranchId(currentUser);
    if (!finalBranchId) {
      throw new Error('HR account is not assigned to a branch');
    }
    const branchDoc = await Branch.findById(finalBranchId);
    if (branchDoc) finalBranchName = branchDoc.name;
  } else if (isAnyAdmin(currentUser)) {
    // Admin or Super Admin can assign any branch
    if (branchId) {
      assertObjectId(branchId, 'Branch ID');
      const branchDoc = await Branch.findById(branchId);
      if (!branchDoc) throw new Error('Selected branch does not exist');
      finalBranchId = branchDoc._id;
      finalBranchName = branchDoc.name;
    }
  }

  // HR and Employee MUST belong to a branch (unless existing legacy data)
  if (selectedRole !== 'admin' && selectedRole !== 'superadmin' && !finalBranchId) {
    throw new Error(`A valid branch assignment is required for ${selectedRole.toUpperCase()}`);
  }

  const existingEmail = await User.findOne({
    email: cleanEmail
  });

  if (existingEmail) {
    throw new Error(
      'A staff member with this email already exists'
    );
  }

  const existingId = await User.findOne({
    employeeId: cleanEmployeeId
  });

  if (existingId) {
    throw new Error(
      'A staff member with this Staff ID already exists'
    );
  }

  const newEmployee = new User({
    name: cleanName,
    email: cleanEmail,
    phone: normalizeString(phone),
    employeeId: cleanEmployeeId,
    idDetails: normalizeString(idDetails),
    passportNumber: normalizeString(passportNumber),
    passportExpireDate:
      parseOptionalDate(passportExpireDate) || null,

    vehicleSpecialization:
      normalizeVehicleSpecialization(
        vehicleSpecialization
      ) || '',

    branch: finalBranchName,
    branchId: finalBranchId,
    position: normalizeString(position),
    garageShop: normalizeString(garageShop),
    role: selectedRole,
    status: selectedStatus,
    password: password || '123456'
  });

  await newEmployee.save();

  return User.findById(newEmployee._id)
    .populate('branchId', 'name code address phone status')
    .lean();
};

const updateEmployee = async (
  id,
  {
    name,
    email,
    role,
    status,
    phone,
    employeeId,
    idDetails,
    passportNumber,
    passportExpireDate,
    vehicleSpecialization,
    branch,
    branchId,
    position,
    garageShop
  },
  currentUser
) => {
  assertObjectId(id, 'staff id');

  const user = await User.findById(id);

  if (!user) {
    throw new Error('Employee not found');
  }

  // Privilege check: only superadmin can modify a superadmin
  if (user.role === 'superadmin' && !isSuperAdmin(currentUser)) {
    const error = new Error('Only Super Admin can modify a Super Admin account');
    error.statusCode = 403;
    throw error;
  }

  // Prevent last active superadmin from demotion or deactivation
  if (user.role === 'superadmin' && ((role && role !== 'superadmin') || status === 'inactive')) {
    const activeSuperAdmins = await User.countDocuments({ role: 'superadmin', status: 'active' });
    if (activeSuperAdmins <= 1) {
      throw new Error('Cannot demote or deactivate the only active Super Admin');
    }
  }

  // Branch check for HR
  if (currentUser && !isAnyAdmin(currentUser)) {
    assertBranchAccess(user.branchId, currentUser, 'modify');
    if (role === 'admin' || role === 'superadmin') {
      throw new Error('HR cannot elevate staff to admin');
    }
  }

  if (email !== undefined) {
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail) {
      throw new Error('Email is required');
    }

    if (cleanEmail !== user.email) {
      const existing = await User.findOne({
        email: cleanEmail
      });

      if (
        existing &&
        existing._id.toString() !== id
      ) {
        throw new Error(
          'Email is already in use by another user'
        );
      }

      user.email = cleanEmail;
    }
  }

  if (employeeId !== undefined) {
    const cleanEmployeeId =
      normalizeEmployeeId(employeeId);

    if (!cleanEmployeeId) {
      throw new Error('Staff ID is required');
    }

    if (cleanEmployeeId !== user.employeeId) {
      const existing = await User.findOne({
        employeeId: cleanEmployeeId
      });

      if (
        existing &&
        existing._id.toString() !== id
      ) {
        throw new Error(
          'Employee ID is already in use'
        );
      }

      user.employeeId = cleanEmployeeId;
    }
  }

  if (name !== undefined) {
    const cleanName = normalizeString(name);

    if (!cleanName) {
      throw new Error('Name is required');
    }

    user.name = cleanName;
  }

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      throw new Error('Invalid role');
    }

    // Only superadmin can assign or revoke superadmin role
    if ((role === 'superadmin' || user.role === 'superadmin') && !isSuperAdmin(currentUser)) {
      const error = new Error('Only Super Admin can grant or revoke Super Admin privileges');
      error.statusCode = 403;
      throw error;
    }

    user.role = role;
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      throw new Error('Invalid staff status');
    }

    user.status = status;
  }

  if (phone !== undefined) {
    user.phone = normalizeString(phone);
  }

  if (idDetails !== undefined) {
    user.idDetails = normalizeString(idDetails);
  }

  if (passportNumber !== undefined) {
    user.passportNumber =
      normalizeString(passportNumber);
  }

  if (passportExpireDate !== undefined) {
    user.passportExpireDate =
      parseOptionalDate(passportExpireDate) || null;
  }

  if (vehicleSpecialization !== undefined) {
    user.vehicleSpecialization =
      normalizeVehicleSpecialization(
        vehicleSpecialization
      ) || '';
  }

  // Branch update: ONLY Admin or Super Admin can change branch assignment
  if (branchId !== undefined && isAnyAdmin(currentUser)) {
    if (branchId) {
      assertObjectId(branchId, 'Branch ID');
      const branchDoc = await Branch.findById(branchId);
      if (!branchDoc) throw new Error('Selected branch does not exist');
      user.branchId = branchDoc._id;
      user.branch = branchDoc.name;
    } else {
      user.branchId = null;
      user.branch = '';
    }
  } else if (branch !== undefined && !branchId) {
    user.branch = normalizeString(branch);
  }

  if (position !== undefined) {
    user.position = normalizeString(position);
  }

  if (garageShop !== undefined) {
    user.garageShop = normalizeString(garageShop);
  }

  await user.save();

  return User.findById(user._id)
    .populate('branchId', 'name code address phone status')
    .lean();
};

const toggleEmployeeStatus = async (id, status, currentUser) => {
  assertObjectId(id, 'staff id');

  if (!VALID_STATUSES.includes(status)) {
    throw new Error('Invalid staff status');
  }

  const user = await User.findById(id);

  if (!user) {
    throw new Error('Employee not found');
  }

  if (user.role === 'superadmin' && !isSuperAdmin(currentUser)) {
    const error = new Error('Only Super Admin can modify Super Admin accounts');
    error.statusCode = 403;
    throw error;
  }

  if (user.role === 'superadmin' && status === 'inactive') {
    const activeSuperAdmins = await User.countDocuments({ role: 'superadmin', status: 'active' });
    if (activeSuperAdmins <= 1) {
      const error = new Error('Cannot deactivate the only active Super Admin');
      error.statusCode = 400;
      throw error;
    }
  }

  if (currentUser && !isAnyAdmin(currentUser)) {
    assertBranchAccess(user.branchId, currentUser, 'modify');
  }

  user.status = status;

  await user.save();

  return user.toJSON();
};

const resetEmployeePassword = async (
  id,
  newPassword,
  currentUser
) => {
  assertObjectId(id, 'staff id');

  const user = await User.findById(id);

  if (!user) {
    throw new Error('Employee not found');
  }

  if (user.role === 'superadmin' && !isSuperAdmin(currentUser)) {
    const error = new Error('Only Super Admin can reset Super Admin passwords');
    error.statusCode = 403;
    throw error;
  }

  if (currentUser && !isAnyAdmin(currentUser)) {
    assertBranchAccess(user.branchId, currentUser, 'modify');
  }

  if (
    !newPassword ||
    String(newPassword).length < 6
  ) {
    throw new Error(
      'Password must be at least 6 characters long'
    );
  }

  user.password = String(newPassword);

  await user.save();

  return {
    message: 'Password reset successfully'
  };
};

const getActiveEmployeesList = async (currentUser, queryParams = {}) => {
  const query = { status: 'active' };

  if (currentUser && !isAdmin(currentUser)) {
    // HR and employee only see active staff in their branch
    const userBranch = getUserBranchId(currentUser);
    query.branchId = userBranch;
  } else if (queryParams.branchId && queryParams.branchId !== 'all') {
    if (queryParams.branchId === 'unassigned') {
      query.$or = [{ branchId: null }, { branchId: { $exists: false } }];
    } else {
      query.branchId = queryParams.branchId;
    }
  }

  return User.find(query)
    .populate('branchId', 'name code')
    .select(
      '_id name email employeeId role vehicleSpecialization branch branchId'
    )
    .sort({ name: 1 })
    .lean();
};

module.exports = {
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  resetEmployeePassword,
  getActiveEmployeesList,
  getVehicleSpecializations,
  createVehicleSpecialization
};