const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createCustomerReceipt = async (data) => {
  const {
    customer_id,
    invoice_no,
    payment_mode,
    amount,
    remarks,
    created_at,
  } = data;

  await prisma.$executeRaw`
    CALL create_customer_receipt(
      ${data.customer_id ?? null},
      ${data.invoice_no ?? null},
      ${data.payment_mode ?? null},
      ${data.amount ?? null},
      ${data.remarks ?? null},
      ${data.created_at ?? null}
    )
  `;
};

const updateCustomerReceipt = async (id, data) => {
  const {
    customer_id,
    invoice_no,
    payment_mode,
    amount,
    remarks,
    created_at,
  } = data;

  await prisma.$executeRaw`
    CALL update_customer_receipt(
      ${Number(id)},
      ${data.customer_id ?? null},
      ${data.invoice_no ?? null},
      ${data.payment_mode ?? null},
      ${data.amount ?? null},
      ${data.remarks ?? null},
      ${data.created_at ?? null}
    )
  `;
};

const deleteCustomerReceipt = async (id) => {
  await prisma.$executeRaw`CALL delete_customer_receipt(${Number(id)})`;
};

const getAllCustomerReceipts = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM customer_receipts
    ORDER BY id DESC
  `;
};

const getCustomerReceiptById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM customer_receipts
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createCustomerReceipt,
  updateCustomerReceipt,
  deleteCustomerReceipt,
  getAllCustomerReceipts,
  getCustomerReceiptById,
};



