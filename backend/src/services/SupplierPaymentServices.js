const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createSupplierPayment = async (data) => {
  const {
    supplier_id,
    purchase_id,
    payment_mode,
    amount,
    remarks,
    payment_date,
  } = data;

  await prisma.$executeRaw`
    CALL create_supplier_payment(
      ${data.supplier_id ?? null},
      ${data.purchase_id ?? null},
      ${data.payment_mode ?? null},
      ${data.amount ?? null},
      ${data.remarks ?? null},
      ${data.payment_date ?? null}
    )
  `;
};

const updateSupplierPayment = async (id, data) => {
  const {
    supplier_id,
    purchase_id,
    payment_mode,
    amount,
    remarks,
    payment_date,
  } = data;

  await prisma.$executeRaw`
    CALL update_supplier_payment(
      ${Number(id)},
      ${data.supplier_id ?? null},
      ${data.purchase_id ?? null},
      ${data.payment_mode ?? null},
      ${data.amount ?? null},
      ${data.remarks ?? null},
      ${data.payment_date ?? null}
    )
  `;
};

const deleteSupplierPayment = async (id) => {
  await prisma.$executeRaw`CALL delete_supplier_payment(${Number(id)})`;
};

const getAllSupplierPayments = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM supplier_payments
    ORDER BY id DESC
  `;
};

const getSupplierPaymentById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM supplier_payments
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createSupplierPayment,
  updateSupplierPayment,
  deleteSupplierPayment,
  getAllSupplierPayments,
  getSupplierPaymentById,
};



