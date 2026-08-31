const dashboardService = require('../services/dashboardService');

const getDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardStats(req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

module.exports = { getDashboard };
