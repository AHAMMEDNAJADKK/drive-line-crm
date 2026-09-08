const express = require('express');

const router = express.Router();

const {
  authenticate,
  authorize
} = require('../middleware/auth');

const ctrl = require('../controllers/supplierController');

// ============================================================
// AUTHENTICATION
// ============================================================

router.use(authenticate);

// ============================================================
// VEHICLE SPECIALIZATION ROUTES
// IMPORTANT: These must be BEFORE /:id
// ============================================================

// Get all vehicle specializations
router.get(
  '/vehicle-specializations',
  ctrl.getVehicleSpecializations
);

// Add a new vehicle specialization
// Admin and HR only
router.post(
  '/vehicle-specializations',
  authorize('admin', 'hr'),
  ctrl.createVehicleSpecialization
);

// ============================================================
// SUPPLIER ROUTES
// ============================================================

// List suppliers
router.get(
  '/',
  ctrl.listSuppliers
);

// Get supplier by ID
router.get(
  '/:id',
  ctrl.getSupplier
);

// Create supplier
// Admin and HR only
router.post(
  '/',
  authorize('admin', 'hr'),
  ctrl.createSupplier
);

// Update supplier
// Admin and HR only
router.patch(
  '/:id',
  authorize('admin', 'hr'),
  ctrl.updateSupplier
);

module.exports = router;