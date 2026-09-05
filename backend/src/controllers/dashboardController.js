const dashboardService = require('../services/dashboardService');
const { ensurePassportExpiryNotifications } = require('../services/notificationService');

const getDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardStats(req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const getHrDashboard = async (req, res, next) => {
  try {
    await ensurePassportExpiryNotifications();
    const data = await dashboardService.getHrDashboard();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard, getHrDashboard };
