const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  listNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');

const router = express.Router();
router.use(authenticate, authorize('hr'));
router.get('/', listNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;

