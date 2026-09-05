const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getDashboard, getHrDashboard } = require('../controllers/dashboardController');

router.get('/', authenticate, authorize('admin', 'employee'), getDashboard);
router.get('/hr', authenticate, authorize('hr'), getHrDashboard);

module.exports = router;
