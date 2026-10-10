const employeeService = require('../services/employeeService');

const rejectUnauthorizedRoleAssignment = (req, res) => {
  if (req.user?.role !== 'superadmin' && req.body?.role === 'superadmin') {
    res.status(403).json({
      success: false,
      message: 'Only Super Admin can grant Super Admin privileges'
    });
    return true;
  }

  if (req.user?.role === 'hr' && (req.body?.role === 'admin' || req.body?.role === 'superadmin')) {
    res.status(403).json({
      success: false,
      message: 'HR cannot assign administrator roles'
    });
    return true;
  }

  return false;
};

const listEmployees = async (req, res, next) => {
  try {
    const result = await employeeService.listEmployees(
      req.query,
      req.user
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
        req.params.id,
        req.user
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

    if (err.statusCode === 403 || err.message.includes('Forbidden') || err.message.includes('Unauthorized')) {
      return res.status(403).json({
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
  if (rejectUnauthorizedRoleAssignment(req, res)) return;

  try {
    const employee =
      await employeeService.createEmployee(
        req.body,
        req.user
      );

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (err) {
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

    if (err.statusCode === 403 || err.message.includes('Forbidden')) {
      return res.status(403).json({
        success: false,
        message: err.message
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
  if (rejectUnauthorizedRoleAssignment(req, res)) return;

  try {
    const employee =
      await employeeService.updateEmployee(
        req.params.id,
        req.body,
        req.user
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

    if (err.statusCode === 403 || err.message.includes('Forbidden') || err.message.includes('Unauthorized')) {
      return res.status(403).json({
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
      message:
        err.message || 'Failed to update employee'
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
        status,
        req.user
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

    if (err.statusCode === 403 || err.message.includes('Forbidden')) {
      return res.status(403).json({
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
        newPassword,
        req.user
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

    if (err.statusCode === 403 || err.message.includes('Forbidden')) {
      return res.status(403).json({
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
      await employeeService.getActiveEmployeesList(req.user, req.query);

    return res.status(200).json({
      success: true,
      data: employees
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get vehicle specializations for Employee form.
 */
const getVehicleSpecializations = async (
  req,
  res,
  next
) => {
  try {
    const specializations =
      await employeeService.getVehicleSpecializations();

    return res.status(200).json({
      success: true,
      data: specializations
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Create a new vehicle specialization.
 */
const createVehicleSpecialization = async (
  req,
  res,
  next
) => {
  try {
    const specialization =
      await employeeService.createVehicleSpecialization(
        req.body?.name
      );

    return res.status(201).json({
      success: true,
      message:
        'Vehicle specialization added successfully',
      data: specialization
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'Vehicle specialization already exists'
      });
    }

    if (err.message) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

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
  getActiveEmployeesList,
  getVehicleSpecializations,
  createVehicleSpecialization
};