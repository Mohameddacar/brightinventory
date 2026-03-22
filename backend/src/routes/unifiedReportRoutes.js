const express = require('express');
const { authMiddleware } = require('../middlewares/AuthMiddleware');
const unifiedReportController = require('../controllers/UnifiedReportController');

const router = express.Router();

router.use('/reports', authMiddleware);
router.get('/reports', unifiedReportController.getReport);
router.get('/reports/export/pdf', unifiedReportController.exportPdf);
router.get('/reports/export/xlsx', unifiedReportController.exportXlsx);

module.exports = router;
