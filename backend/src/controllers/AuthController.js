const authService = require('../services/AuthServices');

const login = async (req, res) => {
  try {
    const loginValue = String(req.body?.login || '').trim();
    const password = String(req.body?.password || '');

    if (!loginValue) {
      return res.status(400).json({ message: 'username or email is required' });
    }

    if (!password) {
      return res.status(400).json({ message: 'password is required' });
    }

    const result = await authService.login({ login: loginValue, password });
    return res.status(200).json(result);
  } catch (error) {
    if (error.code === 'INVALID_CREDENTIALS' || error.code === 'INACTIVE_ACCOUNT') {
      return res.status(401).json({ message: error.message });
    }

    if (error.code === 'JWT_CONFIG_MISSING') {
      return res.status(500).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to login', error: error.message });
  }
};

const me = async (req, res) => {
  try {
    const userId = Number(req.auth?.user_id || req.auth?.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const session = await authService.getSessionByUserId(userId);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    return res.status(200).json({ user: session });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load session', error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    await authService.requestPasswordReset(email);
    return res.status(200).json({ message: 'Password reset link sent' });
  } catch (error) {
    if (error.code === 'SMTP_CONFIG_MISSING') {
      return res.status(500).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to process forgot password request', error: error.message });
  }
};

module.exports = {
  login,
  me,
  forgotPassword,
};
