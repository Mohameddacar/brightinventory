const express = require('express');
const reportLogController = require('../controllers/ReportLogController');

const router = express.Router();

router.post('/report-logs', reportLogController.createReportLog);
router.get('/report-logs', reportLogController.getReportLogs);
router.get('/report-logs/:id', reportLogController.getReportLog);
router.put('/report-logs/:id', reportLogController.updateReportLog);
router.delete('/report-logs/:id', reportLogController.deleteReportLog);

module.exports = router;
