const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getDashboard, getHrDashboard, getBranchOverview } = require('../controllers/dashboardController');

router.get('/', authenticate, authorize('admin', 'hr', 'employee'), getDashboard);
router.get('/hr', authenticate, authorize('admin', 'hr'), getHrDashboard);
router.get('/branch-overview', authenticate, authorize('admin'), getBranchOverview);

module.exports = router;
