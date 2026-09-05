const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/employeeController');

// All employee routes require authentication
router.use(authenticate);

// Active employees list (for assignment dropdowns) - available to all roles
router.get('/active-list', ctrl.getActiveEmployeesList);

// Admin-only routes
router.get('/', authorize('admin', 'hr'), ctrl.listEmployees);
router.post('/', authorize('admin', 'hr'), ctrl.createEmployee);
router.get('/:id', authorize('admin', 'hr'), ctrl.getEmployee);
router.patch('/:id', authorize('admin', 'hr'), ctrl.updateEmployee);
router.patch('/:id/status', authorize('admin', 'hr'), ctrl.toggleStatus);
router.patch('/:id/reset-password', authorize('admin', 'hr'), ctrl.resetPassword);

module.exports = router;
