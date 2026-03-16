const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createRolePermission = async (data) => {
  const {
    role_id,
    permission_id,
  } = data;

  await prisma.$executeRaw`
    CALL create_role_permission(
      ${data.role_id ?? null},
      ${data.permission_id ?? null}
    )
  `;
};

const updateRolePermission = async (id, data) => {
  const {
    role_id,
    permission_id,
  } = data;

  await prisma.$executeRaw`
    CALL update_role_permission(
      ${Number(id)},
      ${data.role_id ?? null},
      ${data.permission_id ?? null}
    )
  `;
};

const deleteRolePermission = async (id) => {
  await prisma.$executeRaw`CALL delete_role_permission(${Number(id)})`;
};

const getAllRolePermissions = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM role_permissions
    ORDER BY id DESC
  `;
};

const getRolePermissionById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM role_permissions
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createRolePermission,
  updateRolePermission,
  deleteRolePermission,
  getAllRolePermissions,
  getRolePermissionById,
};



