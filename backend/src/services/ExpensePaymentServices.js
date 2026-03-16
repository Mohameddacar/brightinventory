const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createExpensePayment = async (data) => {
  const {
    expense_bill_id,
    payment_mode,
    cash,
    amount,
    remarks,
    payment_date,
  } = data;

  await prisma.$executeRaw`
    CALL create_expense_payment(
      ${data.expense_bill_id ?? null},
      ${data.payment_mode ?? null},
      ${data.cash ?? null},
      ${data.amount ?? null},
      ${data.remarks ?? null},
      ${data.payment_date ?? null}
    )
  `;
};

const updateExpensePayment = async (id, data) => {
  const {
    expense_bill_id,
    payment_mode,
    cash,
    amount,
    remarks,
    payment_date,
  } = data;

  await prisma.$executeRaw`
    CALL update_expense_payment(
      ${Number(id)},
      ${data.expense_bill_id ?? null},
      ${data.payment_mode ?? null},
      ${data.cash ?? null},
      ${data.amount ?? null},
      ${data.remarks ?? null},
      ${data.payment_date ?? null}
    )
  `;
};

const deleteExpensePayment = async (id) => {
  await prisma.$executeRaw`CALL delete_expense_payment(${Number(id)})`;
};

const getAllExpensePayments = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM expense_payments
    ORDER BY id DESC
  `;
};

const getExpensePaymentById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM expense_payments
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createExpensePayment,
  updateExpensePayment,
  deleteExpensePayment,
  getAllExpensePayments,
  getExpensePaymentById,
};



