const Branch = require('../models/Branch');
const User = require('../models/User');
const Lead = require('../models/Lead');
const { assertObjectId } = require('../utils/ids');

const normalizeString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const normalizeCode = (value) => {
  return normalizeString(value).toUpperCase();
};

/**
 * List branches with search, filters, pagination and quick stats
 */
const listBranches = async (queryParams = {}) => {
  const {
    page = 1,
    limit = 25,
    search = '',
    status = '',
    all = false
  } = queryParams;

  const query = {};

  const cleanSearch = normalizeString(search);
  if (cleanSearch) {
    query.$or = [
      { name: { $regex: cleanSearch, $options: 'i' } },
      { code: { $regex: cleanSearch, $options: 'i' } },
      { address: { $regex: cleanSearch, $options: 'i' } },
      { phone: { $regex: cleanSearch, $options: 'i' } },
      { email: { $regex: cleanSearch, $options: 'i' } }
    ];
  }

  if (status && ['active', 'inactive'].includes(status)) {
    query.status = status;
  }

  const isAll = all === 'true' || all === true;
  let currentPage = Number(page);
  let currentLimit = isAll ? 1000 : Number(limit);

  if (!Number.isFinite(currentPage) || currentPage < 1) currentPage = 1;
  if (!Number.isFinite(currentLimit) || currentLimit < 1) currentLimit = 25;

  const skip = isAll ? 0 : (currentPage - 1) * currentLimit;

  const [branches, total] = await Promise.all([
    Branch.find(query)
      .populate('managerId', 'name employeeId email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean(),
    Branch.countDocuments(query)
  ]);

  const branchIds = branches.map((b) => b._id);

  // Aggregation for counts per branch
  let hrCounts = [];
  let empCounts = [];
  let leadCounts = [];

  if (branchIds.length > 0) {
    const [hrs, emps, leads] = await Promise.all([
      User.aggregate([
        { $match: { branchId: { $in: branchIds }, role: 'hr', status: 'active' } },
        { $group: { _id: '$branchId', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: { branchId: { $in: branchIds }, role: 'employee', status: 'active' } },
        { $group: { _id: '$branchId', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { branchId: { $in: branchIds }, isDeleted: { $ne: true } } },
        { $group: { _id: '$branchId', count: { $sum: 1 } } }
      ])
    ]);
    hrCounts = hrs;
    empCounts = emps;
    leadCounts = leads;
  }

  const hrMap = Object.fromEntries(hrCounts.map((i) => [i._id.toString(), i.count]));
  const empMap = Object.fromEntries(empCounts.map((i) => [i._id.toString(), i.count]));
  const leadMap = Object.fromEntries(leadCounts.map((i) => [i._id.toString(), i.count]));

  const enriched = branches.map((branch) => {
    const bId = branch._id.toString();
    return {
      ...branch,
      hrCount: hrMap[bId] || 0,
      employeeCount: empMap[bId] || 0,
      leadCount: leadMap[bId] || 0
    };
  });

  const totalPages = isAll ? 1 : Math.ceil(total / currentLimit) || 1;

  return {
    branches: enriched,
    data: enriched,
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

/**
 * Fast lookup for branch dropdowns (active branches only)
 */
const getActiveBranchesList = async () => {
  return Branch.find({ status: 'active' })
    .select('_id name code address phone status')
    .sort({ name: 1 })
    .lean();
};

/**
 * Get branch details by ID with assigned staff and stats
 */
const getBranchById = async (id) => {
  assertObjectId(id, 'Branch ID');

  const branch = await Branch.findById(id)
    .populate('managerId', 'name employeeId email phone')
    .lean();

  if (!branch) {
    throw new Error('Branch not found');
  }

  // Fetch staff assigned to this branch
  const staff = await User.find({ branchId: branch._id })
    .select('name email phone employeeId role status vehicleSpecialization position')
    .sort({ role: 1, name: 1 })
    .lean();

  const hrs = staff.filter((s) => s.role === 'hr');
  const employees = staff.filter((s) => s.role === 'employee');

  // Lead metrics for this branch
  const [totalLeads, convertedLeads, lostLeads] = await Promise.all([
    Lead.countDocuments({ branchId: branch._id, isDeleted: { $ne: true } }),
    Lead.countDocuments({ branchId: branch._id, status: 'Converted', isDeleted: { $ne: true } }),
    Lead.countDocuments({ branchId: branch._id, status: 'Lost', isDeleted: { $ne: true } })
  ]);

  return {
    ...branch,
    staff,
    hrs,
    employees,
    metrics: {
      totalStaff: staff.length,
      hrCount: hrs.length,
      employeeCount: employees.length,
      totalLeads,
      convertedLeads,
      lostLeads,
      activeLeads: Math.max(0, totalLeads - convertedLeads - lostLeads)
    }
  };
};

/**
 * Create a new branch
 */
const createBranch = async (data) => {
  const name = normalizeString(data.name);
  const code = normalizeCode(data.code);

  if (!name) {
    throw new Error('Branch name is required');
  }

  if (!code) {
    throw new Error('Branch code is required');
  }

  // Verify unique code
  const existingCode = await Branch.findOne({ code });
  if (existingCode) {
    throw new Error(`Branch code '${code}' is already in use`);
  }

  // Verify safe name
  const existingName = await Branch.findOne({
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
  });
  if (existingName) {
    throw new Error(`Branch name '${name}' already exists`);
  }

  let managerId = null;
  if (data.managerId) {
    assertObjectId(data.managerId, 'Manager ID');
    managerId = data.managerId;
  }

  const cleanEmail = normalizeString(data.email).toLowerCase();
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Invalid email format for branch');
  }

  const branch = new Branch({
    name,
    code,
    address: normalizeString(data.address),
    phone: normalizeString(data.phone),
    email: cleanEmail,
    managerId,
    status: data.status === 'inactive' ? 'inactive' : 'active'
  });

  await branch.save();

  return Branch.findById(branch._id)
    .populate('managerId', 'name employeeId email phone')
    .lean();
};

/**
 * Update an existing branch
 */
const updateBranch = async (id, data) => {
  assertObjectId(id, 'Branch ID');

  const branch = await Branch.findById(id);
  if (!branch) {
    throw new Error('Branch not found');
  }

  if (data.name !== undefined) {
    const name = normalizeString(data.name);
    if (!name) throw new Error('Branch name cannot be empty');

    // Check duplicate name on other branches
    const duplicateName = await Branch.findOne({
      _id: { $ne: id },
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    });
    if (duplicateName) {
      throw new Error(`Another branch already has the name '${name}'`);
    }
    branch.name = name;
  }

  if (data.code !== undefined) {
    const code = normalizeCode(data.code);
    if (!code) throw new Error('Branch code cannot be empty');

    const duplicateCode = await Branch.findOne({
      _id: { $ne: id },
      code
    });
    if (duplicateCode) {
      throw new Error(`Another branch already has the code '${code}'`);
    }
    branch.code = code;
  }

  if (data.address !== undefined) {
    branch.address = normalizeString(data.address);
  }

  if (data.phone !== undefined) {
    branch.phone = normalizeString(data.phone);
  }

  if (data.email !== undefined) {
    const cleanEmail = normalizeString(data.email).toLowerCase();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Invalid email format for branch');
    }
    branch.email = cleanEmail;
  }

  if (data.managerId !== undefined) {
    if (data.managerId) {
      assertObjectId(data.managerId, 'Manager ID');
      branch.managerId = data.managerId;
    } else {
      branch.managerId = null;
    }
  }

  if (data.status !== undefined) {
    if (!['active', 'inactive'].includes(data.status)) {
      throw new Error('Status must be active or inactive');
    }
    branch.status = data.status;
  }

  await branch.save();

  return Branch.findById(branch._id)
    .populate('managerId', 'name employeeId email phone')
    .lean();
};

/**
 * Toggle branch status (active / inactive)
 */
const toggleBranchStatus = async (id, status) => {
  assertObjectId(id, 'Branch ID');

  if (!['active', 'inactive'].includes(status)) {
    throw new Error('Status must be active or inactive');
  }

  const branch = await Branch.findById(id);
  if (!branch) {
    throw new Error('Branch not found');
  }

  branch.status = status;
  await branch.save();

  return Branch.findById(branch._id)
    .populate('managerId', 'name employeeId email phone')
    .lean();
};

/**
 * Assign staff member to a branch
 */
const assignUserToBranch = async (userId, branchId) => {
  assertObjectId(userId, 'User ID');
  if (branchId) {
    assertObjectId(branchId, 'Branch ID');
    const branch = await Branch.findById(branchId);
    if (!branch) throw new Error('Branch not found');
    if (branch.status !== 'active') throw new Error('Cannot assign users to an inactive branch');
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  user.branchId = branchId || null;
  if (branchId) {
    const branch = await Branch.findById(branchId);
    user.branch = branch ? branch.name : '';
  } else {
    user.branch = '';
  }

  await user.save();
  return user.toJSON();
};

module.exports = {
  listBranches,
  getActiveBranchesList,
  getBranchById,
  createBranch,
  updateBranch,
  toggleBranchStatus,
  assignUserToBranch
};
