const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createExpenseType = async (data) => {
  const {
    type_name,
    created_at,
  } = data;

  await prisma.$executeRaw`
    CALL create_expense_type(
      ${data.type_name ?? null},
      ${data.created_at ?? null}
    )
  `;
};

const updateExpenseType = async (id, data) => {
  const {
    type_name,
    created_at,
  } = data;

  await prisma.$executeRaw`
    CALL update_expense_type(
      ${Number(id)},
      ${data.type_name ?? null},
      ${data.created_at ?? null}
    )
  `;
};

const deleteExpenseType = async (id) => {
  await prisma.$executeRaw`CALL delete_expense_type(${Number(id)})`;
};

const getAllExpenseTypes = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM expense_types
    ORDER BY id DESC
  `;
};

const getExpenseTypeById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM expense_types
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createExpenseType,
  updateExpenseType,
  deleteExpenseType,
  getAllExpenseTypes,
  getExpenseTypeById,
};



