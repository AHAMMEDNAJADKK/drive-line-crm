const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/supplierController');

router.use(authenticate);
router.get('/', ctrl.listSuppliers);
router.get('/:id', ctrl.getSupplier);
router.post('/', authorize('admin', 'manager'), ctrl.createSupplier);
router.patch('/:id', authorize('admin', 'manager'), ctrl.updateSupplier);

module.exports = router;
