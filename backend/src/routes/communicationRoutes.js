const express = require('express');
const communicationController = require('../controllers/CommunicationController');

const router = express.Router();

router.post('/communications/email', communicationController.sendEmail);
router.post('/communications/sms', communicationController.sendSms);

module.exports = router;
