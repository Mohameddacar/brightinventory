const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createSaleItem = async (data) => {
  const {
    sale_id,
    product_id,
    quantity,
    price,
    total,
  } = data;

  await prisma.$executeRaw`
    CALL create_sale_item(
      ${data.sale_id ?? null},
      ${data.product_id ?? null},
      ${data.quantity ?? null},
      ${data.price ?? null},
      ${data.total ?? null}
    )
  `;
};

const updateSaleItem = async (id, data) => {
  const {
    sale_id,
    product_id,
    quantity,
    price,
    total,
  } = data;

  await prisma.$executeRaw`
    CALL update_sale_item(
      ${Number(id)},
      ${data.sale_id ?? null},
      ${data.product_id ?? null},
      ${data.quantity ?? null},
      ${data.price ?? null},
      ${data.total ?? null}
    )
  `;
};

const deleteSaleItem = async (id) => {
  await prisma.$executeRaw`CALL delete_sale_item(${Number(id)})`;
};

const getAllSaleItems = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM sale_items
    ORDER BY id DESC
  `;
};

const getSaleItemById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM sale_items
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createSaleItem,
  updateSaleItem,
  deleteSaleItem,
  getAllSaleItems,
  getSaleItemById,
};



