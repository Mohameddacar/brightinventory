const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const accessControlService = require('./AccessControlServices');
const communicationService = require('./CommunicationServices');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error('Missing JWT_SECRET in environment');
    error.code = 'JWT_CONFIG_MISSING';
    throw error;
  }
  return secret;
};

const getUserByLogin = async (login) => {
  const normalized = String(login || '').trim();
  if (!normalized) {
    return null;
  }

  const rows = await prisma.$queryRaw`
    SELECT
      u.id,
      u.name,
      u.email,
      u.password,
      u.role_id,
      r.role_name,
      u.status
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE LOWER(u.email) = LOWER(${normalized})
       OR LOWER(u.name) = LOWER(${normalized})
    LIMIT 1
  `;

  return rows[0] || null;
};

const verifyPassword = async (plainPassword, hashedPassword) => {
  const plain = String(plainPassword || '');
  const hash = String(hashedPassword || '');

  if (!plain || !hash) {
    return false;
  }

  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    return bcrypt.compare(plain, hash);
  }

  // Legacy fallback for plain-text seeded rows.
  return plain === hash;
};

const createAccessToken = (user) => {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      sub: Number(user.id),
      user_id: Number(user.id),
      role_id: Number(user.role_id),
      role_name: String(user.role_name || ''),
      name: String(user.name || ''),
      email: String(user.email || ''),
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' },
  );
};

const verifyAccessToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(String(token || ''), secret);
};

const login = async ({ login, password }) => {
  const user = await getUserByLogin(login);
  if (!user) {
    const error = new Error('Invalid username/email or password');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  if (user.status === false) {
    const error = new Error('Account is inactive. Contact administrator.');
    error.code = 'INACTIVE_ACCOUNT';
    throw error;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    const error = new Error('Invalid username/email or password');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const token = createAccessToken(user);
  const effective = await accessControlService.getEffectivePermissionDataForUser(user.id);

  return {
    token,
    user: {
      id: Number(user.id),
      name: String(user.name || ''),
      email: String(user.email || ''),
      role_id: Number(user.role_id),
      role_name: String(user.role_name || ''),
      permissions: effective?.permission_names || [],
    },
  };
};

const getSessionByUserId = async (userId) => {
  const rows = await prisma.$queryRaw`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role_id,
      r.role_name,
      u.status
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = ${Number(userId)}
    LIMIT 1
  `;

  const user = rows[0] || null;
  if (!user || user.status === false) {
    return null;
  }

  const effective = await accessControlService.getEffectivePermissionDataForUser(user.id);

  return {
    id: Number(user.id),
    name: String(user.name || ''),
    email: String(user.email || ''),
    role_id: Number(user.role_id),
    role_name: String(user.role_name || ''),
    permissions: effective?.permission_names || [],
  };
};

const requestPasswordReset = async (email) => {
  const normalized = String(email || '').trim();
  if (!normalized) {
    return;
  }

  const rows = await prisma.$queryRaw`
    SELECT id, name, email, status
    FROM users
    WHERE LOWER(email) = LOWER(${normalized})
    LIMIT 1
  `;

  const user = rows[0] || null;
  if (!user || user.status === false) {
    return;
  }

  const secret = getJwtSecret();
  const resetToken = jwt.sign(
    {
      sub: Number(user.id),
      type: 'password-reset',
    },
    secret,
    { expiresIn: '30m' },
  );

  const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
  const resetUrl = `${frontendBase}/forgot-password?token=${encodeURIComponent(resetToken)}`;

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;padding:24px;background:#eef3ff;font-family:Arial,Helvetica,sans-serif;">
        <table cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #dbe6ff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;background:linear-gradient(135deg,#0a2f8a,#2374e1);color:#fff;">
              <h2 style="margin:0;font-size:24px;">Bright MTS Inventory</h2>
              <p style="margin:8px 0 0 0;font-size:14px;opacity:0.95;">Password Reset Request</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;color:#1f2937;line-height:1.6;">
              <p>Hello <strong>${String(user.name || 'User')}</strong>,</p>
              <p>We received a password reset request for your account. Click the button below to continue.</p>
              <p style="margin:24px 0;">
                <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#1f7aea;color:#fff;text-decoration:none;font-weight:700;">Reset Password</a>
              </p>
              <p>If you did not request this, you can ignore this email.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await communicationService.sendEmail({
    to: String(user.email),
    subject: 'Bright MTS Password Reset Link',
    html,
    text: `Password reset requested. Use this link: ${resetUrl}`,
  });
};

module.exports = {
  login,
  verifyAccessToken,
  getSessionByUserId,
  requestPasswordReset,
};
