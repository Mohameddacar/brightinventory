const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createSalesReturnItem = async (data) => {
  const {
    sales_return_id,
    product_id,
    quantity,
    amount,
  } = data;

  await prisma.$executeRaw`
    CALL create_sales_return_item(
      ${data.sales_return_id ?? null},
      ${data.product_id ?? null},
      ${data.quantity ?? null},
      ${data.amount ?? null}
    )
  `;
};

const updateSalesReturnItem = async (id, data) => {
  const {
    sales_return_id,
    product_id,
    quantity,
    amount,
  } = data;

  await prisma.$executeRaw`
    CALL update_sales_return_item(
      ${Number(id)},
      ${data.sales_return_id ?? null},
      ${data.product_id ?? null},
      ${data.quantity ?? null},
      ${data.amount ?? null}
    )
  `;
};

const deleteSalesReturnItem = async (id) => {
  await prisma.$executeRaw`CALL delete_sales_return_item(${Number(id)})`;
};

const getAllSalesReturnItems = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM sales_return_items
    ORDER BY id DESC
  `;
};

const getSalesReturnItemById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM sales_return_items
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createSalesReturnItem,
  updateSalesReturnItem,
  deleteSalesReturnItem,
  getAllSalesReturnItems,
  getSalesReturnItemById,
};



