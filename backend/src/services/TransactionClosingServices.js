const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createTransactionClosing = async (data) => {
  const {
    closing_date,
    total_sales,
    total_expense,
    cash_balance,
    created_by,
  } = data;

  await prisma.$executeRaw`
    CALL create_transaction_closing(
      ${data.closing_date ?? null},
      ${data.total_sales ?? null},
      ${data.total_expense ?? null},
      ${data.cash_balance ?? null},
      ${data.created_by ?? null}
    )
  `;
};

const updateTransactionClosing = async (id, data) => {
  const {
    closing_date,
    total_sales,
    total_expense,
    cash_balance,
    created_by,
  } = data;

  await prisma.$executeRaw`
    CALL update_transaction_closing(
      ${Number(id)},
      ${data.closing_date ?? null},
      ${data.total_sales ?? null},
      ${data.total_expense ?? null},
      ${data.cash_balance ?? null},
      ${data.created_by ?? null}
    )
  `;
};

const deleteTransactionClosing = async (id) => {
  await prisma.$executeRaw`CALL delete_transaction_closing(${Number(id)})`;
};

const getAllTransactionClosings = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM transaction_closing
    ORDER BY id DESC
  `;
};

const getTransactionClosingById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM transaction_closing
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createTransactionClosing,
  updateTransactionClosing,
  deleteTransactionClosing,
  getAllTransactionClosings,
  getTransactionClosingById,
};



