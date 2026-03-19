const express = require('express');
const dashboardController = require('../controllers/DashboardController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');

const router = express.Router();

router.use('/dashboard', authMiddleware);
router.get('/dashboard/overview', dashboardController.getDashboardOverview);

module.exports = router;
