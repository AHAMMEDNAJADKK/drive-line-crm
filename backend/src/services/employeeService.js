const User = require('../models/User');
const Lead = require('../models/Lead');
const { assertObjectId } = require('../utils/ids');

const VALID_ROLES = ['admin', 'manager', 'employee'];
const VALID_STATUSES = ['active', 'inactive'];

const normalizeString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const normalizeEmail = (value) => normalizeString(value).toLowerCase();

const normalizeEmployeeId = (value) =>
  normalizeString(value).toUpperCase();

const listEmployees = async ({
  page = 1,
  limit = 25,
  search = '',
  role,
  status
}) => {
  let currentPage = Number(page);
  let currentLimit = Number(limit);

  if (!Number.isFinite(currentPage) || currentPage < 1) {
    currentPage = 1;
  }

  if (!Number.isFinite(currentLimit) || currentLimit < 1) {
    currentLimit = 25;
  }

  // Prevent excessively large requests.
  currentLimit = Math.min(currentLimit, 100);

  const query = {};

  const searchText = normalizeString(search);

  if (searchText) {
    query.$or = [
      { name: { $regex: searchText, $options: 'i' } },
      { email: { $regex: searchText, $options: 'i' } },
      { phone: { $regex: searchText, $options: 'i' } },
      { employeeId: { $regex: searchText, $options: 'i' } },
      { branch: { $regex: searchText, $options: 'i' } },
      { position: { $regex: searchText, $options: 'i' } },
      { garageShop: { $regex: searchText, $options: 'i' } }
    ];
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
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(currentLimit)
    .lean();

  // Count leads assigned to each employee.
  const userIds = users.map((user) => user._id);

  let leadCounts = [];

  if (userIds.length > 0) {
    leadCounts = await Lead.aggregate([
      {
        $match: {
          assignedTo: { $in: userIds }
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

  const totalPages = Math.ceil(total / currentLimit) || 1;

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

const getEmployeeById = async (id) => {
  assertObjectId(id, 'staff id');

  const user = await User.findById(id).lean();

  if (!user) {
    throw new Error('Employee not found');
  }

  const leadsCount = await Lead.countDocuments({
    assignedTo: id
  });

  return {
    ...user,
    leadsAssigned: leadsCount,
    assignedLeadsCount: leadsCount
  };
};

const createEmployee = async ({
  name,
  email,
  phone,
  employeeId,
  role,
  status,
  password,
  idDetails,
  passportNumber,
  branch,
  position,
  garageShop
}) => {
  const cleanName = normalizeString(name);
  const cleanEmail = normalizeEmail(email);
  const cleanEmployeeId = normalizeEmployeeId(employeeId);

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

  const selectedRole = role || 'employee';

  if (!VALID_ROLES.includes(selectedRole)) {
    throw new Error('Invalid role');
  }

  const selectedStatus = status || 'active';

  if (!VALID_STATUSES.includes(selectedStatus)) {
    throw new Error('Invalid staff status');
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
    branch: normalizeString(branch),
    position: normalizeString(position),
    garageShop: normalizeString(garageShop),
    role: selectedRole,
    status: selectedStatus,

    // Keep the existing CRM default password behavior.
    password:
      password !== undefined &&
      password !== null &&
      String(password).length > 0
        ? String(password)
        : 'Driveline@123'
  });

  await newEmployee.save();

  return newEmployee.toJSON();
};

const updateEmployee = async (
  id,
  {
    name,
    email,
    phone,
    employeeId,
    role,
    status,
    idDetails,
    passportNumber,
    branch,
    position,
    garageShop
  }
) => {
  assertObjectId(id, 'staff id');

  const user = await User.findById(id);

  if (!user) {
    throw new Error('Employee not found');
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

  if (phone !== undefined) {
    user.phone = normalizeString(phone);
  }

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      throw new Error('Invalid role');
    }

    user.role = role;
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      throw new Error('Invalid staff status');
    }

    user.status = status;
  }

  if (idDetails !== undefined) {
    user.idDetails = normalizeString(idDetails);
  }

  if (passportNumber !== undefined) {
    user.passportNumber =
      normalizeString(passportNumber);
  }

  if (branch !== undefined) {
    user.branch = normalizeString(branch);
  }

  if (position !== undefined) {
    user.position = normalizeString(position);
  }

  if (garageShop !== undefined) {
    user.garageShop =
      normalizeString(garageShop);
  }

  await user.save();

  return user.toJSON();
};

const toggleEmployeeStatus = async (id, status) => {
  assertObjectId(id, 'staff id');

  if (!VALID_STATUSES.includes(status)) {
    throw new Error('Invalid staff status');
  }

  const user = await User.findById(id);

  if (!user) {
    throw new Error('Employee not found');
  }

  user.status = status;

  await user.save();

  return user.toJSON();
};

const resetEmployeePassword = async (
  id,
  newPassword
) => {
  assertObjectId(id, 'staff id');

  const user = await User.findById(id);

  if (!user) {
    throw new Error('Employee not found');
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

const getActiveEmployeesList = async () => {
  return User.find({
    status: 'active'
  })
    .select('_id name email employeeId role')
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
  getActiveEmployeesList
};