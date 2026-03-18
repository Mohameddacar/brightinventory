const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createExpense = async (expenseData) => {
  const { expense_type_id, invoice_date, receiver_name, amount, remarks } = expenseData;

  await prisma.$executeRaw`
    INSERT INTO expense_bills (
      expense_type_id,
      invoice_date,
      receiver_name,
      amount,
      remarks
    ) VALUES (
      ${Number(expense_type_id)},
      ${new Date(invoice_date)},
      ${receiver_name},
      ${Number(amount)},
      ${remarks ?? null}
    )
  `;
};

const updateExpense = async (id, expenseData) => {
  const { expense_type_id, invoice_date, receiver_name, amount, remarks } = expenseData;

  await prisma.$executeRaw`
    UPDATE expense_bills
    SET
      expense_type_id = ${Number(expense_type_id)},
      invoice_date = ${new Date(invoice_date)},
      receiver_name = ${receiver_name},
      amount = ${Number(amount)},
      remarks = ${remarks ?? null}
    WHERE id = ${Number(id)}
  `;
};

const deleteExpense = async (id) => {
  await prisma.$executeRaw`DELETE FROM expense_bills WHERE id = ${Number(id)}`;
};

const getAllExpenses = async () => {
  return prisma.$queryRaw`
    SELECT e.id, e.expense_type_id, t.type_name, e.invoice_date, e.receiver_name, e.amount, e.remarks, e.created_at
    FROM expense_bills e
    JOIN expense_types t ON t.id = e.expense_type_id
    ORDER BY e.id DESC
  `;
};

const getExpenseById = async (id) => {
  const expenses = await prisma.$queryRaw`
    SELECT e.id, e.expense_type_id, t.type_name, e.invoice_date, e.receiver_name, e.amount, e.remarks, e.created_at
    FROM expense_bills e
    JOIN expense_types t ON t.id = e.expense_type_id
    WHERE e.id = ${Number(id)}
    LIMIT 1
  `;

  return expenses[0] || null;
};

module.exports = {
  createExpense,
  updateExpense,
  deleteExpense,
  getAllExpenses,
  getExpenseById,
};



