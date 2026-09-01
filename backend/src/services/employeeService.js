const User = require('../models/User');
const Lead = require('../models/Lead');

const listEmployees = async ({ page = 1, limit = 25, search = '', role, status }) => {
  const query = {};

  if (search) {
    const s = search.trim();
    query.$or = [
      { name: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
      { employeeId: { $regex: s, $options: 'i' } }
    ];
  }

  if (role) {
    query.role = role;
  }

  if (status) {
    query.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await User.countDocuments(query);

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Aggregate leads count per employee
  const userIds = users.map((u) => u._id);
  const leadCounts = await Lead.aggregate([
    { $match: { assignedTo: { $in: userIds } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } }
  ]);

  const leadCountMap = {};
  leadCounts.forEach((lc) => {
    leadCountMap[lc._id.toString()] = lc.count;
  });

  const enrichedUsers = users.map((u) => ({
    ...u,
    leadsAssigned: leadCountMap[u._id.toString()] || 0,
    assignedLeadsCount: leadCountMap[u._id.toString()] || 0
  }));

  return {
    employees: enrichedUsers,
    data: enrichedUsers,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)) || 1,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1
    }
  };
};

const getEmployeeById = async (id) => {
  const user = await User.findById(id).lean();
  if (!user) {
    throw new Error('Employee not found');
  }
  const leadsCount = await Lead.countDocuments({ assignedTo: id });
  return {
    ...user,
    leadsAssigned: leadsCount,
    assignedLeadsCount: leadsCount
  };
};

const createEmployee = async ({ name, email, phone, employeeId, role, status, password }) => {
  // Check unique email
  const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingEmail) {
    throw new Error('An employee with this email already exists');
  }

  // Check unique employeeId
  const existingId = await User.findOne({ employeeId: employeeId.toUpperCase().trim() });
  if (existingId) {
    throw new Error('An employee with this Employee ID already exists');
  }

  const newEmployee = new User({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone ? phone.trim() : '',
    employeeId: employeeId.toUpperCase().trim(),
    role: role || 'employee',
    status: status || 'active',
    password: password || 'Driveline@123' // default password if not specified
  });

  await newEmployee.save();
  return newEmployee.toJSON();
};

const updateEmployee = async (id, { name, email, phone, employeeId, role, status }) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error('Employee not found');
  }

  if (email && email.toLowerCase().trim() !== user.email) {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing && existing._id.toString() !== id) {
      throw new Error('Email is already in use by another user');
    }
    user.email = email.toLowerCase().trim();
  }

  if (employeeId && employeeId.toUpperCase().trim() !== user.employeeId) {
    const existing = await User.findOne({ employeeId: employeeId.toUpperCase().trim() });
    if (existing && existing._id.toString() !== id) {
      throw new Error('Employee ID is already in use');
    }
    user.employeeId = employeeId.toUpperCase().trim();
  }

  if (name) user.name = name.trim();
  if (phone !== undefined) user.phone = phone ? phone.trim() : '';
  if (role) user.role = role;
  if (status) user.status = status;

  await user.save();
  return user.toJSON();
};

const toggleEmployeeStatus = async (id, status) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error('Employee not found');
  }
  user.status = status;
  await user.save();
  return user.toJSON();
};

const resetEmployeePassword = async (id, newPassword) => {
  const user = await User.findById(id);
  if (!user) {
    throw new Error('Employee not found');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
  user.password = newPassword;
  await user.save();
  return { message: 'Password reset successfully' };
};

const getActiveEmployeesList = async () => {
  return User.find({ status: 'active' }).select('_id name email employeeId role').sort({ name: 1 }).lean();
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
