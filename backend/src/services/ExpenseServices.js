const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createExpense = async (expenseData) => {
  const { expense_type_id, invoice_date, receiver_name, amount, remarks } = expenseData;

  await prisma.$executeRaw`
    CALL create_expense(
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
    CALL update_expense(
      ${Number(id)},
      ${Number(expense_type_id)},
      ${new Date(invoice_date)},
      ${receiver_name},
      ${Number(amount)},
      ${remarks ?? null}
    )
  `;
};

const deleteExpense = async (id) => {
  await prisma.$executeRaw`CALL delete_expense(${Number(id)})`;
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



