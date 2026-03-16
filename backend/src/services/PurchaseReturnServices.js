const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createPurchaseReturn = async (data) => {
  const {
    transaction_no,
    purchase_id,
    supplier_id,
    return_type,
    return_date,
    total_amount,
  } = data;

  await prisma.$executeRaw`
    CALL create_purchase_return(
      ${data.transaction_no ?? null},
      ${data.purchase_id ?? null},
      ${data.supplier_id ?? null},
      ${data.return_type ?? null},
      ${data.return_date ?? null},
      ${data.total_amount ?? null}
    )
  `;
};

const updatePurchaseReturn = async (id, data) => {
  const {
    transaction_no,
    purchase_id,
    supplier_id,
    return_type,
    return_date,
    total_amount,
  } = data;

  await prisma.$executeRaw`
    CALL update_purchase_return(
      ${Number(id)},
      ${data.transaction_no ?? null},
      ${data.purchase_id ?? null},
      ${data.supplier_id ?? null},
      ${data.return_type ?? null},
      ${data.return_date ?? null},
      ${data.total_amount ?? null}
    )
  `;
};

const deletePurchaseReturn = async (id) => {
  await prisma.$executeRaw`CALL delete_purchase_return(${Number(id)})`;
};

const getAllPurchaseReturns = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM purchase_returns
    ORDER BY id DESC
  `;
};

const getPurchaseReturnById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM purchase_returns
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createPurchaseReturn,
  updatePurchaseReturn,
  deletePurchaseReturn,
  getAllPurchaseReturns,
  getPurchaseReturnById,
};



