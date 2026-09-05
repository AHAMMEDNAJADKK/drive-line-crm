const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { listNotifications } = require('../controllers/notificationController');

const router = express.Router();
router.use(authenticate, authorize('hr'));
router.get('/', listNotifications);

module.exports = router;
