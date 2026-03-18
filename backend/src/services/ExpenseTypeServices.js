const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createExpenseType = async (data) => {
  await prisma.$executeRaw`
    INSERT INTO expense_types (
      type_name,
      created_at
    ) VALUES (
      ${data.type_name ?? null},
      ${data.created_at ? new Date(data.created_at) : new Date()}
    )
  `;
};

const updateExpenseType = async (id, data) => {
  await prisma.$executeRaw`
    UPDATE expense_types
    SET
      type_name = ${data.type_name ?? null},
      created_at = ${data.created_at ? new Date(data.created_at) : null}
    WHERE id = ${Number(id)}
  `;
};

const deleteExpenseType = async (id) => {
  await prisma.$executeRaw`DELETE FROM expense_types WHERE id = ${Number(id)}`;
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



