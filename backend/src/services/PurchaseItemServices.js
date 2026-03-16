const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createPurchaseItem = async (data) => {
  const {
    purchase_id,
    product_id,
    expire_date,
    cost,
    quantity,
    price,
    amount,
  } = data;

  await prisma.$executeRaw`
    CALL create_purchase_item(
      ${data.purchase_id ?? null},
      ${data.product_id ?? null},
      ${data.expire_date ?? null},
      ${data.cost ?? null},
      ${data.quantity ?? null},
      ${data.price ?? null},
      ${data.amount ?? null}
    )
  `;
};

const updatePurchaseItem = async (id, data) => {
  const {
    purchase_id,
    product_id,
    expire_date,
    cost,
    quantity,
    price,
    amount,
  } = data;

  await prisma.$executeRaw`
    CALL update_purchase_item(
      ${Number(id)},
      ${data.purchase_id ?? null},
      ${data.product_id ?? null},
      ${data.expire_date ?? null},
      ${data.cost ?? null},
      ${data.quantity ?? null},
      ${data.price ?? null},
      ${data.amount ?? null}
    )
  `;
};

const deletePurchaseItem = async (id) => {
  await prisma.$executeRaw`CALL delete_purchase_item(${Number(id)})`;
};

const getAllPurchaseItems = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM purchase_items
    ORDER BY id DESC
  `;
};

const getPurchaseItemById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM purchase_items
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createPurchaseItem,
  updatePurchaseItem,
  deletePurchaseItem,
  getAllPurchaseItems,
  getPurchaseItemById,
};



