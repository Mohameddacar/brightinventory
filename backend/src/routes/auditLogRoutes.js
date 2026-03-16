const express = require('express');
const auditLogController = require('../controllers/AuditLogController');

const router = express.Router();

router.post('/audit-logs', auditLogController.createAuditLog);
router.get('/audit-logs', auditLogController.getAuditLogs);
router.get('/audit-logs/:id', auditLogController.getAuditLog);
router.put('/audit-logs/:id', auditLogController.updateAuditLog);
router.delete('/audit-logs/:id', auditLogController.deleteAuditLog);

module.exports = router;
