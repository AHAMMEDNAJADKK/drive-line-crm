const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/employeeController');

// All employee routes require authentication
router.use(authenticate);

// Active employees list (for assignment dropdowns) - available to all roles
router.get('/active-list', ctrl.getActiveEmployeesList);

// Admin-only routes
router.get('/', authorize('admin', 'manager'), ctrl.listEmployees);
router.post('/', authorize('admin'), ctrl.createEmployee);
router.get('/:id', authorize('admin', 'manager'), ctrl.getEmployee);
router.patch('/:id', authorize('admin', 'manager'), ctrl.updateEmployee);
router.patch('/:id/status', authorize('admin'), ctrl.toggleStatus);
router.patch('/:id/reset-password', authorize('admin'), ctrl.resetPassword);

module.exports = router;
