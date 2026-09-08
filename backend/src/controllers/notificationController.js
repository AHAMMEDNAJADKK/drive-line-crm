const notificationService = require('../services/notificationService');

const listNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.listNotifications(req.user);
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user
    );
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead
};

