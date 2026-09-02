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
// SUPPLIER ROUTES
// ============================================================

// List suppliers
router.get('/', ctrl.listSuppliers);

// Get supplier by ID
router.get('/:id', ctrl.getSupplier);

// Create supplier
// Admin and Manager only
router.post(
  '/',
  authorize('admin', 'manager'),
  ctrl.createSupplier
);

// Update supplier
// Admin and Manager only
router.patch(
  '/:id',
  authorize('admin', 'manager'),
  ctrl.updateSupplier
);

module.exports = router;