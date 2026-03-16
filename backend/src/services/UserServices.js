const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createUser = async (data) => {
  const {
    name,
    email,
    password,
    role_id,
    phone,
    status,
  } = data;

  await prisma.$executeRaw`
    CALL create_user(
      ${data.name ?? null},
      ${data.email ?? null},
      ${data.password ?? null},
      ${data.role_id ?? null},
      ${data.phone ?? null},
      ${data.status ?? null}
    )
  `;
};

const updateUser = async (id, data) => {
  const {
    name,
    email,
    password,
    role_id,
    phone,
    status,
  } = data;

  await prisma.$executeRaw`
    CALL update_user(
      ${Number(id)},
      ${data.name ?? null},
      ${data.email ?? null},
      ${data.password ?? null},
      ${data.role_id ?? null},
      ${data.phone ?? null},
      ${data.status ?? null}
    )
  `;
};

const deleteUser = async (id) => {
  await prisma.$executeRaw`CALL delete_user(${Number(id)})`;
};

const getAllUsers = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM users
    ORDER BY id DESC
  `;
};

const getUserById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM users
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUserById,
};



