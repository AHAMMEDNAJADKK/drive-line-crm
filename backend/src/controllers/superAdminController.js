const superAdminService = require('../services/superAdminService');

const getDashboard = async (req, res, next) => {
  try {
    const branchId = req.query.branchId || req.query.branch;
    const data = await superAdminService.getSuperAdminDashboard(branchId);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    return next(err);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const result = await superAdminService.listAllUsers(req.query);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    return next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const user = await superAdminService.createUser(req.body, req.user);
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (err) {
    const statusCode = err.statusCode || (err.code === 11000 ? 409 : 400);
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Failed to create user'
    });
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await superAdminService.updateUser(req.params.id, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (err) {
    const statusCode = err.statusCode || (err.code === 11000 ? 409 : 400);
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Failed to update user'
    });
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const user = await superAdminService.toggleUserStatus(req.params.id, status, req.user);
    return res.status(200).json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Failed to update status'
    });
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const result = await superAdminService.resetUserPassword(req.params.id, newPassword, req.user);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Failed to reset password'
    });
  }
};

const getBranchAudit = async (req, res, next) => {
  try {
    const data = await superAdminService.getBranchAudit();
    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    return next(err);
  }
};

const fixAssignments = async (req, res, next) => {
  try {
    const result = await superAdminService.fixBranchAssignments(req.body, req.user);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: err.message || 'Failed to fix branch assignments'
    });
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const result = await superAdminService.getAuditLogs(req.query);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getDashboard,
  listUsers,
  createUser,
  updateUser,
  toggleStatus,
  resetPassword,
  getBranchAudit,
  fixAssignments,
  getAuditLogs
};
