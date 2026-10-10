const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Lead = require('../models/Lead');
const LeadActivity = require('../models/LeadActivity');
const AuditLog = require('../models/AuditLog');
const { assertObjectId } = require('../utils/ids');
const { STAFF_ROLES, isSuperAdmin } = require('../utils/roles');
const { logAudit } = require('../utils/auditLogger');

/**
 * Format uptime seconds to human-readable string.
 */
const formatUptime = (seconds) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
};

/**
 * Get comprehensive Super Admin dashboard metrics.
 */
const getSuperAdminDashboard = async (requestedBranchParam = null) => {
  const requestedBranchId = (typeof requestedBranchParam === 'object' && requestedBranchParam !== null)
    ? (requestedBranchParam.branchId || requestedBranchParam._id || null)
    : requestedBranchParam;

  const isBranchScoped = Boolean(
    requestedBranchId &&
    requestedBranchId !== 'all' &&
    requestedBranchId !== 'unassigned' &&
    requestedBranchId !== ''
  );

  const isUnassignedScoped = requestedBranchId === 'unassigned';

  // 1. Fetch branches overview
  const allBranches = await Branch.find({})
    .populate('managerId', 'name employeeId email phone')
    .sort({ name: 1 })
    .lean();

  const totalBranches = allBranches.length;
  const activeBranches = allBranches.filter((b) => b.status === 'active').length;
  const inactiveBranches = totalBranches - activeBranches;
  const validBranchIds = allBranches.map((b) => b._id);
  const validBranchIdStrings = new Set(allBranches.map((b) => b._id.toString()));

  // 2. Lead scoping query
  const leadFilter = { isDeleted: { $ne: true } };
  if (isBranchScoped) {
    assertObjectId(requestedBranchId, 'Branch ID');
    leadFilter.branchId = new mongoose.Types.ObjectId(requestedBranchId);
  } else if (isUnassignedScoped) {
    leadFilter.$or = [{ branchId: null }, { branchId: { $exists: false } }];
  }

  // User scoping query
  const userFilter = {};
  if (isBranchScoped) {
    userFilter.branchId = new mongoose.Types.ObjectId(requestedBranchId);
  } else if (isUnassignedScoped) {
    userFilter.$or = [{ branchId: null }, { branchId: { $exists: false } }];
  }

  // 3. Parallel aggregation for leads and users
  const [
    totalLeads,
    convertedLeads,
    lostLeads,
    newLeads,
    contactedLeads,
    followupLeads,
    quotationLeads,
    totalUsers,
    superAdminCount,
    adminCount,
    hrCount,
    employeeCount,
    activeUsers,
    inactiveUsers
  ] = await Promise.all([
    Lead.countDocuments(leadFilter),
    Lead.countDocuments({ ...leadFilter, status: 'Converted' }),
    Lead.countDocuments({ ...leadFilter, status: 'Lost' }),
    Lead.countDocuments({ ...leadFilter, status: 'New' }),
    Lead.countDocuments({ ...leadFilter, status: 'Contacted' }),
    Lead.countDocuments({ ...leadFilter, status: { $in: ['Followup', 'Follow Up'] } }),
    Lead.countDocuments({ ...leadFilter, status: 'Quotation' }),
    User.countDocuments(userFilter),
    User.countDocuments({ ...userFilter, role: 'superadmin' }),
    User.countDocuments({ ...userFilter, role: 'admin' }),
    User.countDocuments({ ...userFilter, role: 'hr' }),
    User.countDocuments({ ...userFilter, role: 'employee' }),
    User.countDocuments({ ...userFilter, status: 'active' }),
    User.countDocuments({ ...userFilter, status: 'inactive' })
  ]);

  const closedLeads = convertedLeads + lostLeads;
  const openLeads = Math.max(0, totalLeads - closedLeads);
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

  // 4. Branch-wise Lead Distribution
  const branchLeadAgg = await Lead.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: '$branchId',
        total: { $sum: 1 },
        converted: { $sum: { $cond: [{ $eq: ['$status', 'Converted'] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
        new: { $sum: { $cond: [{ $eq: ['$status', 'New'] }, 1, 0] } },
        contacted: { $sum: { $cond: [{ $eq: ['$status', 'Contacted'] }, 1, 0] } },
        followup: {
          $sum: { $cond: [{ $in: ['$status', ['Followup', 'Follow Up']] }, 1, 0] }
        },
        quotation: { $sum: { $cond: [{ $eq: ['$status', 'Quotation'] }, 1, 0] } }
      }
    }
  ]);

  const leadDistributionMap = {};
  let unassignedLeadsStats = { total: 0, converted: 0, lost: 0, open: 0 };

  branchLeadAgg.forEach((item) => {
    const bId = item._id ? item._id.toString() : 'unassigned';
    const open = Math.max(0, item.total - (item.converted + item.lost));
    if (bId === 'unassigned') {
      unassignedLeadsStats = { ...item, open };
    } else {
      leadDistributionMap[bId] = { ...item, open };
    }
  });

  // 5. Branch-wise Employee Distribution
  const branchUserAgg = await User.aggregate([
    {
      $group: {
        _id: '$branchId',
        total: { $sum: 1 },
        employees: { $sum: { $cond: [{ $eq: ['$role', 'employee'] }, 1, 0] } },
        hrs: { $sum: { $cond: [{ $eq: ['$role', 'hr'] }, 1, 0] } },
        admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }
      }
    }
  ]);

  const userDistributionMap = {};
  let unassignedUsersStats = { total: 0, employees: 0, hrs: 0, admins: 0 };

  branchUserAgg.forEach((item) => {
    const bId = item._id ? item._id.toString() : 'unassigned';
    if (bId === 'unassigned') {
      unassignedUsersStats = item;
    } else {
      userDistributionMap[bId] = item;
    }
  });

  const branchLeadDistribution = allBranches.map((branch) => {
    const bId = branch._id.toString();
    const lStats = leadDistributionMap[bId] || {
      total: 0,
      converted: 0,
      lost: 0,
      open: 0,
      new: 0,
      contacted: 0,
      followup: 0,
      quotation: 0
    };
    const cRate = lStats.total > 0 ? ((lStats.converted / lStats.total) * 100).toFixed(1) : '0.0';
    return {
      branchId: bId,
      branchName: branch.name,
      branchCode: branch.code,
      status: branch.status,
      totalLeads: lStats.total,
      openLeads: lStats.open,
      convertedLeads: lStats.converted,
      lostLeads: lStats.lost,
      conversionRate: cRate
    };
  });

  const branchEmployeeDistribution = allBranches.map((branch) => {
    const bId = branch._id.toString();
    const uStats = userDistributionMap[bId] || {
      total: 0,
      employees: 0,
      hrs: 0,
      admins: 0,
      active: 0
    };
    return {
      branchId: bId,
      branchName: branch.name,
      branchCode: branch.code,
      status: branch.status,
      totalStaff: uStats.total,
      employeeCount: uStats.employees,
      hrCount: uStats.hrs,
      adminCount: uStats.admins,
      managerName: branch.managerId?.name || 'Unassigned'
    };
  });

  // 6. Recent CRM Activity
  let activityLeadQuery = {};
  if (isBranchScoped) {
    const leadsInBranch = await Lead.find({
      branchId: new mongoose.Types.ObjectId(requestedBranchId)
    }).select('_id').lean();
    activityLeadQuery = { leadId: { $in: leadsInBranch.map((l) => l._id) } };
  }

  const recentActivity = await LeadActivity.find(activityLeadQuery)
    .populate('performedBy', 'name email role employeeId')
    .populate({
      path: 'leadId',
      select: 'customerName mobileNumber status branchId vehicleMake',
      populate: { path: 'branchId', select: 'name code' }
    })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  // 7. System Health Indicators
  const memory = process.memoryUsage();
  const systemHealth = {
    dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    dbHost: mongoose.connection.host || 'MongoDB Atlas',
    dbName: mongoose.connection.name || 'default',
    serverUptimeSeconds: Math.floor(process.uptime()),
    serverUptimeFormatted: formatUptime(process.uptime()),
    nodeVersion: process.version,
    memoryUsageMB: {
      heapUsed: (memory.heapUsed / 1024 / 1024).toFixed(1),
      heapTotal: (memory.heapTotal / 1024 / 1024).toFixed(1),
      rss: (memory.rss / 1024 / 1024).toFixed(1)
    },
    environment: process.env.NODE_ENV || 'development',
    serverTime: new Date().toISOString()
  };

  // 8. Relationship Health & Orphaned Records Audit
  const [unassignedStaffCount, unassignedLeadsCount, allUsersWithBranch, allLeadsWithBranch] = await Promise.all([
    User.countDocuments({
      role: { $in: ['hr', 'employee'] },
      $or: [{ branchId: null }, { branchId: { $exists: false } }]
    }),
    Lead.countDocuments({
      isDeleted: { $ne: true },
      $or: [{ branchId: null }, { branchId: { $exists: false } }]
    }),
    User.find({ branchId: { $ne: null } }).select('branchId').lean(),
    Lead.find({ branchId: { $ne: null }, isDeleted: { $ne: true } }).select('branchId').lean()
  ]);

  const orphanedStaffCount = allUsersWithBranch.filter(
    (u) => u.branchId && !validBranchIdStrings.has(u.branchId.toString())
  ).length;

  const orphanedLeadsCount = allLeadsWithBranch.filter(
    (l) => l.branchId && !validBranchIdStrings.has(l.branchId.toString())
  ).length;

  const relationshipHealth = {
    unassignedStaffCount,
    unassignedLeadsCount,
    orphanedStaffCount,
    orphanedLeadsCount,
    hasIssues: Boolean(
      unassignedStaffCount > 0 ||
      unassignedLeadsCount > 0 ||
      orphanedStaffCount > 0 ||
      orphanedLeadsCount > 0
    )
  };

  // Selected branch details if specific branch is active
  let selectedBranchInfo = null;
  if (isBranchScoped) {
    selectedBranchInfo = allBranches.find((b) => b._id.toString() === requestedBranchId) || null;
  }

  return {
    selectedBranchId: requestedBranchId || '',
    selectedBranchInfo,
    summary: {
      totalBranches,
      activeBranches,
      inactiveBranches,
      totalUsers,
      superAdminCount,
      adminCount,
      hrCount,
      employeeCount,
      activeUsers,
      inactiveUsers,
      totalLeads,
      openLeads,
      closedLeads,
      convertedLeads,
      lostLeads,
      newLeads,
      contactedLeads,
      followupLeads,
      quotationLeads,
      conversionRate
    },
    branchLeadDistribution,
    branchEmployeeDistribution,
    recentActivity: recentActivity.filter((a) => a.leadId),
    systemHealth,
    relationshipHealth,
    unassignedStats: {
      leads: unassignedLeadsStats,
      users: unassignedUsersStats
    }
  };
};

/**
 * List all users across all branches for Super Admin.
 */
const listAllUsers = async (queryParams = {}) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    role = '',
    status = '',
    branchId = ''
  } = queryParams;

  const query = {};

  if (role && STAFF_ROLES.includes(role)) {
    query.role = role;
  }

  if (status && ['active', 'inactive'].includes(status)) {
    query.status = status;
  }

  if (branchId === 'unassigned') {
    query.$or = [{ branchId: null }, { branchId: { $exists: false } }];
  } else if (branchId && branchId !== 'all') {
    assertObjectId(branchId, 'Branch ID');
    query.branchId = new mongoose.Types.ObjectId(branchId);
  }

  const s = String(search || '').trim();
  if (s) {
    const searchConditions = [
      { name: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } },
      { employeeId: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
      { position: { $regex: s, $options: 'i' } }
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchConditions }];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  const currentPage = Math.max(1, Number(page) || 1);
  const currentLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const skip = (currentPage - 1) * currentLimit;

  const [users, total] = await Promise.all([
    User.find(query)
      .populate('branchId', 'name code address phone status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean(),
    User.countDocuments(query)
  ]);

  // Aggregate assigned leads count for these users
  const userIds = users.map((u) => u._id);
  let leadCountsMap = {};
  if (userIds.length > 0) {
    const leadCounts = await Lead.aggregate([
      { $match: { assignedTo: { $in: userIds }, isDeleted: { $ne: true } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
    ]);
    leadCounts.forEach((lc) => {
      leadCountsMap[lc._id.toString()] = lc.count;
    });
  }

  const enrichedUsers = users.map((user) => ({
    ...user,
    assignedLeadsCount: leadCountsMap[user._id.toString()] || 0
  }));

  const totalPages = Math.ceil(total / currentLimit) || 1;

  return {
    users: enrichedUsers,
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
 * Super Admin creates a user account.
 */
const createUser = async (userData, currentUser) => {
  const {
    name,
    email,
    employeeId,
    phone,
    role,
    status = 'active',
    branchId,
    password,
    position,
    idDetails,
    passportNumber,
    passportExpireDate,
    vehicleSpecialization
  } = userData;

  if (!name || !name.trim()) throw new Error('Name is required');
  if (!email || !email.trim()) throw new Error('Email is required');
  if (!employeeId || !employeeId.trim()) throw new Error('Staff ID is required');

  const cleanEmail = email.toLowerCase().trim();
  const cleanEmployeeId = employeeId.toUpperCase().trim();

  // Validate duplicate email
  const existingEmail = await User.findOne({ email: cleanEmail });
  if (existingEmail) {
    const error = new Error('A user with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  // Validate duplicate employee ID
  const existingId = await User.findOne({ employeeId: cleanEmployeeId });
  if (existingId) {
    const error = new Error('A user with this Staff ID already exists');
    error.statusCode = 409;
    throw error;
  }

  const selectedRole = role || 'employee';
  if (!STAFF_ROLES.includes(selectedRole)) {
    throw new Error('Invalid role specified');
  }

  // Only Super Admin can create Super Admin
  if (selectedRole === 'superadmin' && !isSuperAdmin(currentUser)) {
    const error = new Error('Only Super Admin can grant Super Admin privileges');
    error.statusCode = 403;
    throw error;
  }

  // Validate branch assignment
  let finalBranchId = null;
  let finalBranchName = '';

  if (branchId) {
    assertObjectId(branchId, 'Branch ID');
    const branchDoc = await Branch.findById(branchId);
    if (!branchDoc) throw new Error('Selected branch does not exist');
    finalBranchId = branchDoc._id;
    finalBranchName = branchDoc.name;
  }

  // HR and Employee require a valid branch
  if ((selectedRole === 'hr' || selectedRole === 'employee') && !finalBranchId) {
    throw new Error(`A valid branch assignment is required for ${selectedRole.toUpperCase()}`);
  }

  const newUser = new User({
    name: name.trim(),
    email: cleanEmail,
    employeeId: cleanEmployeeId,
    phone: phone ? phone.trim() : '',
    role: selectedRole,
    status: ['active', 'inactive'].includes(status) ? status : 'active',
    password: password && String(password).length >= 6 ? password : '123456',
    branchId: finalBranchId,
    branch: finalBranchName,
    position: position ? position.trim() : '',
    idDetails: idDetails ? idDetails.trim() : '',
    passportNumber: passportNumber ? passportNumber.trim() : '',
    passportExpireDate: passportExpireDate ? new Date(passportExpireDate) : null,
    vehicleSpecialization: vehicleSpecialization || ''
  });

  await newUser.save();

  await logAudit({
    action: 'USER_CREATED',
    performedBy: currentUser._id,
    targetUser: newUser._id,
    targetBranch: finalBranchId,
    details: {
      role: newUser.role,
      email: newUser.email,
      name: newUser.name,
      branchId: finalBranchId
    }
  });

  return User.findById(newUser._id)
    .populate('branchId', 'name code address phone status')
    .lean();
};

/**
 * Super Admin updates any user account.
 */
const updateUser = async (userId, updateData, currentUser) => {
  assertObjectId(userId, 'User ID');

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const previousRole = user.role;
  const previousStatus = user.status;
  const previousBranchId = user.branchId?.toString() || null;

  // Protect last active superadmin against demotion or deactivation
  if (user.role === 'superadmin') {
    const isDemoting = updateData.role && updateData.role !== 'superadmin';
    const isDeactivating = updateData.status === 'inactive';
    if (isDemoting || isDeactivating) {
      const activeSuperAdmins = await User.countDocuments({ role: 'superadmin', status: 'active' });
      if (activeSuperAdmins <= 1) {
        throw new Error('Cannot demote or deactivate the only active Super Admin');
      }
    }
  }

  // Only superadmin can assign or revoke superadmin role
  if (updateData.role !== undefined) {
    if (!STAFF_ROLES.includes(updateData.role)) {
      throw new Error('Invalid role specified');
    }
    if ((updateData.role === 'superadmin' || user.role === 'superadmin') && !isSuperAdmin(currentUser)) {
      const error = new Error('Only Super Admin can grant or revoke Super Admin privileges');
      error.statusCode = 403;
      throw error;
    }
    user.role = updateData.role;
  }

  if (updateData.name !== undefined) {
    const cleanName = String(updateData.name).trim();
    if (!cleanName) throw new Error('Name cannot be empty');
    user.name = cleanName;
  }

  if (updateData.email !== undefined) {
    const cleanEmail = String(updateData.email).toLowerCase().trim();
    if (!cleanEmail) throw new Error('Email cannot be empty');
    if (cleanEmail !== user.email) {
      const existing = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (existing) {
        const error = new Error('Email is already in use by another account');
        error.statusCode = 409;
        throw error;
      }
      user.email = cleanEmail;
    }
  }

  if (updateData.employeeId !== undefined) {
    const cleanId = String(updateData.employeeId).toUpperCase().trim();
    if (!cleanId) throw new Error('Staff ID cannot be empty');
    if (cleanId !== user.employeeId) {
      const existing = await User.findOne({ employeeId: cleanId, _id: { $ne: user._id } });
      if (existing) {
        const error = new Error('Staff ID is already in use by another account');
        error.statusCode = 409;
        throw error;
      }
      user.employeeId = cleanId;
    }
  }

  if (updateData.status !== undefined) {
    if (!['active', 'inactive'].includes(updateData.status)) {
      throw new Error('Status must be active or inactive');
    }
    user.status = updateData.status;
  }

  if (updateData.phone !== undefined) {
    user.phone = String(updateData.phone).trim();
  }

  if (updateData.position !== undefined) {
    user.position = String(updateData.position).trim();
  }

  // Branch assignment
  if (updateData.branchId !== undefined) {
    if (updateData.branchId) {
      assertObjectId(updateData.branchId, 'Branch ID');
      const branchDoc = await Branch.findById(updateData.branchId);
      if (!branchDoc) throw new Error('Selected branch does not exist');
      user.branchId = branchDoc._id;
      user.branch = branchDoc.name;
    } else {
      // Unassign branch (allowed for admin/superadmin, reject for active employee/hr)
      if (user.role === 'employee' || user.role === 'hr') {
        throw new Error(`A valid branch assignment is required for active ${user.role.toUpperCase()}`);
      }
      user.branchId = null;
      user.branch = '';
    }
  }

  if (updateData.password && String(updateData.password).length >= 6) {
    user.password = String(updateData.password);
  }

  await user.save();

  await logAudit({
    action: 'USER_UPDATED',
    performedBy: currentUser._id,
    targetUser: user._id,
    targetBranch: user.branchId,
    details: {
      roleChanged: previousRole !== user.role ? { from: previousRole, to: user.role } : null,
      statusChanged: previousStatus !== user.status ? { from: previousStatus, to: user.status } : null,
      branchChanged: previousBranchId !== (user.branchId?.toString() || null)
    }
  });

  return User.findById(user._id)
    .populate('branchId', 'name code address phone status')
    .lean();
};

/**
 * Super Admin toggle user status.
 */
const toggleUserStatus = async (userId, status, currentUser) => {
  assertObjectId(userId, 'User ID');
  if (!['active', 'inactive'].includes(status)) {
    throw new Error('Status must be active or inactive');
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.role === 'superadmin' && status === 'inactive') {
    const activeSuperAdmins = await User.countDocuments({ role: 'superadmin', status: 'active' });
    if (activeSuperAdmins <= 1) {
      throw new Error('Cannot deactivate the only active Super Admin');
    }
  }

  user.status = status;
  await user.save();

  await logAudit({
    action: 'USER_STATUS_TOGGLED',
    performedBy: currentUser._id,
    targetUser: user._id,
    targetBranch: user.branchId,
    details: { newStatus: status }
  });

  return user.toJSON();
};

/**
 * Super Admin reset password.
 */
const resetUserPassword = async (userId, newPassword, currentUser) => {
  assertObjectId(userId, 'User ID');
  if (!newPassword || String(newPassword).length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  user.password = String(newPassword);
  await user.save();

  await logAudit({
    action: 'PASSWORD_RESET',
    performedBy: currentUser._id,
    targetUser: user._id,
    targetBranch: user.branchId,
    details: { reason: 'Super Admin forced password reset' }
  });

  return { message: 'Password reset successfully' };
};

/**
 * Audit and detect unassigned or orphaned branch relationships.
 */
const getBranchAudit = async () => {
  const branches = await Branch.find({}).lean();
  const validBranchIdStrings = new Set(branches.map((b) => b._id.toString()));

  const [unassignedStaff, unassignedLeads, allStaffWithBranch, allLeadsWithBranch] = await Promise.all([
    User.find({
      role: { $in: ['hr', 'employee'] },
      $or: [{ branchId: null }, { branchId: { $exists: false } }]
    }).select('name email employeeId role status').lean(),
    Lead.find({
      isDeleted: { $ne: true },
      $or: [{ branchId: null }, { branchId: { $exists: false } }]
    }).select('customerName mobileNumber status createdAt').limit(50).lean(),
    User.find({ branchId: { $ne: null } })
      .select('name email employeeId role branchId')
      .lean(),
    Lead.find({ branchId: { $ne: null }, isDeleted: { $ne: true } })
      .select('customerName mobileNumber branchId status')
      .limit(100)
      .lean()
  ]);

  const orphanedStaff = allStaffWithBranch.filter(
    (u) => u.branchId && !validBranchIdStrings.has(u.branchId.toString())
  );

  const orphanedLeads = allLeadsWithBranch.filter(
    (l) => l.branchId && !validBranchIdStrings.has(l.branchId.toString())
  );

  return {
    branches: branches.map((b) => ({ _id: b._id, name: b.name, code: b.code, status: b.status })),
    unassignedStaff,
    unassignedLeads,
    orphanedStaff,
    orphanedLeads,
    summary: {
      unassignedStaffCount: unassignedStaff.length,
      unassignedLeadsCount: unassignedLeads.length,
      orphanedStaffCount: orphanedStaff.length,
      orphanedLeadsCount: orphanedLeads.length
    }
  };
};

/**
 * Batch reassign unassigned or orphaned staff/leads to a target branch.
 */
const fixBranchAssignments = async ({ type, ids, targetBranchId }, currentUser) => {
  assertObjectId(targetBranchId, 'Target Branch ID');
  const targetBranch = await Branch.findById(targetBranchId);
  if (!targetBranch) throw new Error('Target branch does not exist');
  if (targetBranch.status !== 'active') throw new Error('Target branch is inactive');

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Please provide at least one record ID to reassign');
  }

  const validIds = ids.map((id) => new mongoose.Types.ObjectId(id));

  let affectedCount = 0;

  if (type === 'staff') {
    const res = await User.updateMany(
      { _id: { $in: validIds } },
      { $set: { branchId: targetBranch._id, branch: targetBranch.name } }
    );
    affectedCount = res.modifiedCount;
  } else if (type === 'leads') {
    const res = await Lead.updateMany(
      { _id: { $in: validIds } },
      { $set: { branchId: targetBranch._id } }
    );
    affectedCount = res.modifiedCount;
  } else {
    throw new Error("Invalid type. Must be 'staff' or 'leads'");
  }

  await logAudit({
    action: 'BRANCH_RELATIONSHIPS_FIXED',
    performedBy: currentUser._id,
    targetBranch: targetBranch._id,
    details: {
      type,
      reassignedCount: affectedCount,
      targetBranchName: targetBranch.name
    }
  });

  return {
    message: `Successfully reassigned ${affectedCount} ${type} to ${targetBranch.name} (${targetBranch.code})`,
    affectedCount
  };
};

/**
 * Fetch administrative audit logs.
 */
const getAuditLogs = async (queryParams = {}) => {
  const { page = 1, limit = 25 } = queryParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const currentLimit = Math.max(1, Math.min(100, Number(limit) || 25));
  const skip = (currentPage - 1) * currentLimit;

  const [logs, total] = await Promise.all([
    AuditLog.find({})
      .populate('performedBy', 'name email role employeeId')
      .populate('targetUser', 'name email role employeeId')
      .populate('targetBranch', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit)
      .lean(),
    AuditLog.countDocuments({})
  ]);

  return {
    logs,
    total,
    page: currentPage,
    pages: Math.ceil(total / currentLimit) || 1
  };
};

module.exports = {
  getSuperAdminDashboard,
  listAllUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  getBranchAudit,
  fixBranchAssignments,
  getAuditLogs
};
