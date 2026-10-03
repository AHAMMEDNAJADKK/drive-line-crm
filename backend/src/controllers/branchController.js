const branchService = require('../services/branchService');

const listBranches = async (req, res, next) => {
  try {
    const result = await branchService.listBranches(req.query);
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    return next(err);
  }
};

const getActiveList = async (req, res, next) => {
  try {
    const branches = await branchService.getActiveBranchesList();
    return res.status(200).json({
      success: true,
      data: branches
    });
  } catch (err) {
    return next(err);
  }
};

const getBranch = async (req, res, next) => {
  try {
    const branch = await branchService.getBranchById(req.params.id);
    return res.status(200).json({
      success: true,
      data: branch
    });
  } catch (err) {
    if (err.message === 'Branch not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    return next(err);
  }
};

const createBranch = async (req, res, next) => {
  try {
    const branch = await branchService.createBranch(req.body);
    return res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: branch
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Branch code already exists'
      });
    }
    if (err.message && err.message.includes('already exists') || err.message.includes('already in use')) {
      return res.status(409).json({
        success: false,
        message: err.message
      });
    }
    if (err.message) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
};

const updateBranch = async (req, res, next) => {
  try {
    const branch = await branchService.updateBranch(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Branch updated successfully',
      data: branch
    });
  } catch (err) {
    if (err.message === 'Branch not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err.code === 11000 || (err.message && err.message.includes('already'))) {
      return res.status(409).json({ success: false, message: err.message });
    }
    if (err.message) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const branch = await branchService.toggleBranchStatus(req.params.id, status);
    return res.status(200).json({
      success: true,
      message: `Branch ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: branch
    });
  } catch (err) {
    if (err.message === 'Branch not found') {
      return res.status(404).json({ success: false, message: err.message });
    }
    if (err.message) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
};

const assignUser = async (req, res, next) => {
  try {
    const { userId, branchId } = req.body;
    const user = await branchService.assignUserToBranch(userId, branchId || req.params.id);
    return res.status(200).json({
      success: true,
      message: 'User branch assignment updated',
      data: user
    });
  } catch (err) {
    if (err.message) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
};

module.exports = {
  listBranches,
  getActiveList,
  getBranch,
  createBranch,
  updateBranch,
  toggleStatus,
  assignUser
};
