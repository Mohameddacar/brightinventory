const nodemailer = require('nodemailer');

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const assertEmailConfig = () => {
  const required = ['EMAIL_USER', 'EMAIL_PASS'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    const error = new Error(`Missing email environment variables: ${missing.join(', ')}`);
    error.code = 'SMTP_CONFIG_MISSING';
    throw error;
  }
};

const sendEmail = async ({ to, subject, html, text }) => {
  assertEmailConfig();

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE
    ? parseBoolean(process.env.SMTP_SECURE)
    : port === 465;
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const info = await transport.sendMail({
    from,
    to,
    subject,
    html: html || undefined,
    text: text || undefined,
  });

  return {
    accepted: info.accepted,
    rejected: info.rejected,
    messageId: info.messageId,
  };
};

const sendSms = async () => {
  const error = new Error('SMS provider is not configured yet. This will be connected later.');
  error.code = 'SMS_NOT_IMPLEMENTED';
  throw error;
};

module.exports = {
  sendEmail,
  sendSms,
};
