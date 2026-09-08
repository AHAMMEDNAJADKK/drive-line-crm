const express = require('express');

const router = express.Router();

const {
  authenticate,
  authorize
} = require('../middleware/auth');

const ctrl = require('../controllers/employeeController');

// All employee routes require authentication
router.use(authenticate);

// Active employees list (for assignment dropdowns)
// Available to all authenticated roles
router.get(
  '/active-list',
  ctrl.getActiveEmployeesList
);

// Vehicle specialization routes
// IMPORTANT: These must be before /:id
router.get(
  '/vehicle-specializations',
  ctrl.getVehicleSpecializations
);

router.post(
  '/vehicle-specializations',
  authorize('admin', 'hr'),
  ctrl.createVehicleSpecialization
);

// Admin/HR employee routes
router.get(
  '/',
  authorize('admin', 'hr'),
  ctrl.listEmployees
);

router.post(
  '/',
  authorize('admin', 'hr'),
  ctrl.createEmployee
);

router.get(
  '/:id',
  authorize('admin', 'hr'),
  ctrl.getEmployee
);

router.patch(
  '/:id',
  authorize('admin', 'hr'),
  ctrl.updateEmployee
);

router.patch(
  '/:id/status',
  authorize('admin', 'hr'),
  ctrl.toggleStatus
);

router.patch(
  '/:id/reset-password',
  authorize('admin', 'hr'),
  ctrl.resetPassword
);

module.exports = router;