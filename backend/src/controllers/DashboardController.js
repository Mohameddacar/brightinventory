const dashboardService = require('../services/DashboardServices');

const getDashboardOverview = async (req, res) => {
  try {
    const data = await dashboardService.getDashboardOverview();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load dashboard overview', error: error.message });
  }
};

module.exports = {
  getDashboardOverview,
};
