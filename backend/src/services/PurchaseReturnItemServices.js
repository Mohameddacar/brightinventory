const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createPurchaseReturnItem = async (data) => {
  const {
    purchase_return_id,
    product_id,
    quantity,
    amount,
  } = data;

  await prisma.$executeRaw`
    CALL create_purchase_return_item(
      ${data.purchase_return_id ?? null},
      ${data.product_id ?? null},
      ${data.quantity ?? null},
      ${data.amount ?? null}
    )
  `;
};

const updatePurchaseReturnItem = async (id, data) => {
  const {
    purchase_return_id,
    product_id,
    quantity,
    amount,
  } = data;

  await prisma.$executeRaw`
    CALL update_purchase_return_item(
      ${Number(id)},
      ${data.purchase_return_id ?? null},
      ${data.product_id ?? null},
      ${data.quantity ?? null},
      ${data.amount ?? null}
    )
  `;
};

const deletePurchaseReturnItem = async (id) => {
  await prisma.$executeRaw`CALL delete_purchase_return_item(${Number(id)})`;
};

const getAllPurchaseReturnItems = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM purchase_return_items
    ORDER BY id DESC
  `;
};

const getPurchaseReturnItemById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM purchase_return_items
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createPurchaseReturnItem,
  updatePurchaseReturnItem,
  deletePurchaseReturnItem,
  getAllPurchaseReturnItems,
  getPurchaseReturnItemById,
};



