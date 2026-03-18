const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createExpensePayment = async (data) => {
  await prisma.$executeRaw`
    INSERT INTO expense_payments (
      expense_bill_id,
      payment_mode,
      cash,
      amount,
      remarks,
      payment_date
    ) VALUES (
      ${Number(data.expense_bill_id)},
      ${data.payment_mode},
      ${Number(data.cash)},
      ${Number(data.amount)},
      ${data.remarks ?? null},
      ${new Date(data.payment_date)}
    )
  `;
};

const updateExpensePayment = async (id, data) => {
  await prisma.$executeRaw`
    UPDATE expense_payments
    SET
      expense_bill_id = ${Number(data.expense_bill_id)},
      payment_mode = ${data.payment_mode},
      cash = ${Number(data.cash)},
      amount = ${Number(data.amount)},
      remarks = ${data.remarks ?? null},
      payment_date = ${new Date(data.payment_date)}
    WHERE id = ${Number(id)}
  `;
};

const deleteExpensePayment = async (id) => {
  await prisma.$executeRaw`DELETE FROM expense_payments WHERE id = ${Number(id)}`;
};

const getAllExpensePayments = async () => {
  return prisma.$queryRaw`
    SELECT
      ep.id,
      ep.expense_bill_id,
      ep.payment_mode,
      ep.cash,
      ep.amount,
      ep.remarks,
      ep.payment_date,
      eb.receiver_name,
      eb.invoice_date
    FROM expense_payments ep
    JOIN expense_bills eb ON eb.id = ep.expense_bill_id
    ORDER BY ep.id DESC
  `;
};

const getExpensePaymentById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT
      ep.id,
      ep.expense_bill_id,
      ep.payment_mode,
      ep.cash,
      ep.amount,
      ep.remarks,
      ep.payment_date,
      eb.receiver_name,
      eb.invoice_date
    FROM expense_payments ep
    JOIN expense_bills eb ON eb.id = ep.expense_bill_id
    WHERE ep.id = ${Number(id)}
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



