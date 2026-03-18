const authService = require('../services/AuthServices');

const resolveToken = (req) => {
  const authHeader = String(req.headers?.authorization || '');
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = String(req.headers?.cookie || '');
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(';').map((chunk) => chunk.trim());
  for (const part of parts) {
    if (part.toLowerCase().startsWith('ims_token=')) {
      return decodeURIComponent(part.split('=').slice(1).join('=')).trim();
    }
  }

  return null;
};

const authMiddleware = (req, res, next) => {
  try {
    const token = resolveToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const payload = authService.verifyAccessToken(token);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = {
  authMiddleware,
};
