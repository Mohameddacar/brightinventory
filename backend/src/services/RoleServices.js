const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CORE_ROLES = [
  { role_name: 'Admin', description: 'System administration access' },
  { role_name: 'Finance', description: 'Finance and accounting operations' },
  { role_name: 'Receipt', description: 'Receipt and payment processing' },
];

const normalizeRoleName = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'admin') return 'Admin';
  if (raw === 'finance') return 'Finance';
  if (raw === 'receipt') return 'Receipt';
  return null;
};

const ensureCoreRoles = async () => {
  for (const role of CORE_ROLES) {
    await prisma.$executeRaw`
      INSERT INTO roles (role_name, description)
      SELECT ${role.role_name}, ${role.description}
      WHERE NOT EXISTS (
        SELECT 1
        FROM roles
        WHERE LOWER(role_name) = LOWER(${role.role_name})
      )
    `;
  }
};

const createRole = async (data) => {
  const normalizedRoleName = normalizeRoleName(data.role_name);
  if (!normalizedRoleName) {
    const error = new Error('role_name must be one of: Admin, Finance, Receipt');
    error.code = 'INVALID_ROLE_NAME';
    throw error;
  }

  await ensureCoreRoles();

  const existing = await prisma.$queryRaw`
    SELECT id
    FROM roles
    WHERE LOWER(role_name) = LOWER(${normalizedRoleName})
    LIMIT 1
  `;

  if (existing.length > 0) {
    const error = new Error('Role already exists');
    error.code = 'ROLE_EXISTS';
    throw error;
  }

  await prisma.$executeRaw`
    INSERT INTO roles (role_name, description)
    VALUES (
      ${normalizedRoleName},
      ${data.description ?? null}
    )
  `;
};

const updateRole = async (id, data) => {
  const normalizedRoleName = normalizeRoleName(data.role_name);
  if (!normalizedRoleName) {
    const error = new Error('role_name must be one of: Admin, Finance, Receipt');
    error.code = 'INVALID_ROLE_NAME';
    throw error;
  }

  await ensureCoreRoles();

  await prisma.$executeRaw`
    UPDATE roles
    SET
      role_name = ${normalizedRoleName},
      description = ${data.description ?? null}
    WHERE id = ${Number(id)}
  `;
};

const deleteRole = async (id) => {
  const role = await getRoleById(id);
  if (!role) {
    return;
  }

  if (normalizeRoleName(role.role_name)) {
    const error = new Error('Core roles (Admin, Finance, Receipt) cannot be deleted');
    error.code = 'CORE_ROLE_DELETE_BLOCKED';
    throw error;
  }

  await prisma.$executeRaw`DELETE FROM roles WHERE id = ${Number(id)}`;
};

const getAllRoles = async () => {
  await ensureCoreRoles();

  return prisma.$queryRaw`
    SELECT *
    FROM roles
    ORDER BY
      CASE
        WHEN LOWER(role_name) = 'admin' THEN 1
        WHEN LOWER(role_name) = 'finance' THEN 2
        WHEN LOWER(role_name) = 'receipt' THEN 3
        ELSE 4
      END,
      role_name ASC,
      id ASC
  `;
};

const getRoleById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM roles
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createRole,
  updateRole,
  deleteRole,
  getAllRoles,
  getRoleById,
  ensureCoreRoles,
};



