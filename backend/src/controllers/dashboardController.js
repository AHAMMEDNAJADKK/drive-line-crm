const dashboardService = require('../services/dashboardService');
const { ensurePassportExpiryNotifications } = require('../services/notificationService');

const getDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardStats(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const getHrDashboard = async (req, res, next) => {
  try {
    await ensurePassportExpiryNotifications();
    const data = await dashboardService.getHrDashboard(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getBranchOverview = async (req, res, next) => {
  try {
    const data = await dashboardService.getBranchOverview(req.user, req.query);
    res.json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403 || err.message?.includes('Forbidden')) {
      return res.status(403).json({ success: false, message: err.message });
    }
    next(err);
  }
};

module.exports = { getDashboard, getHrDashboard, getBranchOverview };
