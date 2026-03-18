const communicationService = require('../services/CommunicationServices');

const isValidEmail = (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const isLikelyPhone = (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  return /^\+?[0-9]{8,16}$/.test(value.replace(/\s+/g, ''));
};

const sendEmail = async (req, res) => {
  try {
    const { to, subject, html, text } = req.body || {};

    if (!isValidEmail(to)) {
      return res.status(400).json({ message: 'A valid recipient email is required' });
    }

    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ message: 'Email subject is required' });
    }

    if (!html && !text) {
      return res.status(400).json({ message: 'Email body is required' });
    }

    const result = await communicationService.sendEmail({ to, subject, html, text });
    return res.status(200).json({ message: 'Email sent successfully', ...result });
  } catch (error) {
    if (error.code === 'SMTP_CONFIG_MISSING') {
      return res.status(500).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
};

const sendSms = async (req, res) => {
  try {
    const { to, message } = req.body || {};

    if (!isLikelyPhone(to)) {
      return res.status(400).json({ message: 'A valid recipient mobile number is required' });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'SMS message is required' });
    }

    const result = await communicationService.sendSms({ to, message });
    return res.status(200).json({ message: 'SMS sent successfully', ...result });
  } catch (error) {
    if (error.code === 'SMS_NOT_IMPLEMENTED') {
      return res.status(501).json({ message: error.message });
    }

    if (error.code === 'SMS_CONFIG_MISSING' || error.code === 'SMS_SEND_FAILED') {
      return res.status(500).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to send SMS', error: error.message });
  }
};

module.exports = {
  sendEmail,
  sendSms,
};
