const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createRole = async (data) => {
  const {
    role_name,
    description,
  } = data;

  await prisma.$executeRaw`
    CALL create_role(
      ${data.role_name ?? null},
      ${data.description ?? null}
    )
  `;
};

const updateRole = async (id, data) => {
  const {
    role_name,
    description,
  } = data;

  await prisma.$executeRaw`
    CALL update_role(
      ${Number(id)},
      ${data.role_name ?? null},
      ${data.description ?? null}
    )
  `;
};

const deleteRole = async (id) => {
  await prisma.$executeRaw`CALL delete_role(${Number(id)})`;
};

const getAllRoles = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM roles
    ORDER BY id DESC
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
};



