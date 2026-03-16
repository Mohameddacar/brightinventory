const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createPermission = async (data) => {
  const {
    module,
    permission_name,
  } = data;

  await prisma.$executeRaw`
    CALL create_permission(
      ${data.module ?? null},
      ${data.permission_name ?? null}
    )
  `;
};

const updatePermission = async (id, data) => {
  const {
    module,
    permission_name,
  } = data;

  await prisma.$executeRaw`
    CALL update_permission(
      ${Number(id)},
      ${data.module ?? null},
      ${data.permission_name ?? null}
    )
  `;
};

const deletePermission = async (id) => {
  await prisma.$executeRaw`CALL delete_permission(${Number(id)})`;
};

const getAllPermissions = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM permissions
    ORDER BY id DESC
  `;
};

const getPermissionById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM permissions
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createPermission,
  updatePermission,
  deletePermission,
  getAllPermissions,
  getPermissionById,
};



