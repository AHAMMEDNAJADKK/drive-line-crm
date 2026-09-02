const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/customerController');

router.use(authenticate);
router.get('/lookup', ctrl.lookupByPhone);
router.get('/', ctrl.listCustomers);
router.post('/', ctrl.createCustomer);
router.get('/:id', ctrl.getCustomer);
router.patch('/:id', ctrl.updateCustomer);

module.exports = router;
