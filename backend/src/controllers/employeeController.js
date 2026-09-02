const employeeService = require('../services/employeeService');

const listEmployees = async (req, res, next) => {
  try {
    const result = await employeeService.listEmployees(
      req.query
    );

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    return next(err);
  }
};

const getEmployee = async (req, res, next) => {
  try {
    const employee =
      await employeeService.getEmployeeById(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      data: employee
    });
  } catch (err) {
    if (err.message === 'Employee not found') {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }

    if (err.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (
      err.name === 'CastError' ||
      err.name === 'ValidationError'
    ) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    return next(err);
  }
};

const createEmployee = async (req, res, next) => {
  try {
    const employee =
      await employeeService.createEmployee(
        req.body
      );

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (err) {
    // Duplicate email / Staff ID
    if (err.code === 11000) {
      const duplicateField =
        Object.keys(err.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message:
          duplicateField === 'email'
            ? 'A staff member with this email already exists'
            : duplicateField === 'employeeId'
              ? 'A staff member with this Staff ID already exists'
              : 'A staff member with this information already exists'
      });
    }

    if (
      err.name === 'ValidationError' ||
      err.name === 'CastError'
    ) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    // Service validation errors
    if (err.message) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    return next(err);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const employee =
      await employeeService.updateEmployee(
        req.params.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: employee
    });
  } catch (err) {
    if (err.message === 'Employee not found') {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }

    if (err.code === 11000) {
      const duplicateField =
        Object.keys(err.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message:
          duplicateField === 'email'
            ? 'Email is already in use by another user'
            : duplicateField === 'employeeId'
              ? 'Employee ID is already in use'
              : 'Staff information already exists'
      });
    }

    if (
      err.name === 'ValidationError' ||
      err.name === 'CastError'
    ) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || 'Failed to update employee'
    });
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be active or inactive'
      });
    }

    const employee =
      await employeeService.toggleEmployeeStatus(
        req.params.id,
        status
      );

    return res.status(200).json({
      success: true,
      message:
        status === 'active'
          ? 'Employee activated successfully'
          : 'Employee deactivated successfully',
      data: employee
    });
  } catch (err) {
    if (err.message === 'Employee not found') {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }

    if (
      err.name === 'CastError' ||
      err.statusCode === 400
    ) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    return next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    const result =
      await employeeService.resetEmployeePassword(
        req.params.id,
        newPassword
      );

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    if (err.message === 'Employee not found') {
      return res.status(404).json({
        success: false,
        message: err.message
      });
    }

    if (
      err.name === 'CastError' ||
      err.statusCode === 400
    ) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    return res.status(400).json({
      success: false,
      message:
        err.message || 'Failed to reset password'
    });
  }
};

const getActiveEmployeesList = async (
  req,
  res,
  next
) => {
  try {
    const employees =
      await employeeService.getActiveEmployeesList();

    return res.status(200).json({
      success: true,
      data: employees
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  toggleStatus,
  resetPassword,
  getActiveEmployeesList
};