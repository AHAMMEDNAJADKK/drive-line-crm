const employeeService = require('../services/employeeService');

const listEmployees = async (req, res, next) => {
  try {
    const result = await employeeService.listEmployees(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);
    res.json({ success: true, data: employee });
  } catch (err) { res.status(404).json({ success: false, message: err.message }); }
};

const createEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.createEmployee(req.body);
    res.status(201).json({ success: true, message: 'Employee created successfully', data: employee });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const updateEmployee = async (req, res, next) => {
  try {
    const employee = await employeeService.updateEmployee(req.params.id, req.body);
    res.json({ success: true, message: 'Employee updated successfully', data: employee });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const toggleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or inactive' });
    }
    const employee = await employeeService.toggleEmployeeStatus(req.params.id, status);
    res.json({ success: true, message: `Employee ${status === 'active' ? 'activated' : 'deactivated'} successfully`, data: employee });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const result = await employeeService.resetEmployeePassword(req.params.id, newPassword);
    res.json({ success: true, ...result });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const getActiveEmployeesList = async (req, res, next) => {
  try {
    const employees = await employeeService.getActiveEmployeesList();
    res.json({ success: true, data: employees });
  } catch (err) { next(err); }
};

module.exports = { listEmployees, getEmployee, createEmployee, updateEmployee, toggleStatus, resetPassword, getActiveEmployeesList };
