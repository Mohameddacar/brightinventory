const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createCashDeposit = async (data) => {
  const {
    amount,
    deposit_date,
    remarks,
  } = data;

  await prisma.$executeRaw`
    CALL create_cash_deposit(
      ${data.amount ?? null},
      ${data.deposit_date ?? null},
      ${data.remarks ?? null}
    )
  `;
};

const updateCashDeposit = async (id, data) => {
  const {
    amount,
    deposit_date,
    remarks,
  } = data;

  await prisma.$executeRaw`
    CALL update_cash_deposit(
      ${Number(id)},
      ${data.amount ?? null},
      ${data.deposit_date ?? null},
      ${data.remarks ?? null}
    )
  `;
};

const deleteCashDeposit = async (id) => {
  await prisma.$executeRaw`CALL delete_cash_deposit(${Number(id)})`;
};

const getAllCashDeposits = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM cash_deposits
    ORDER BY id DESC
  `;
};

const getCashDepositById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM cash_deposits
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createCashDeposit,
  updateCashDeposit,
  deleteCashDeposit,
  getAllCashDeposits,
  getCashDepositById,
};



