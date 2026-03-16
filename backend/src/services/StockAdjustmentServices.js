const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createStockAdjustment = async (stockData) => {
  const {
    product_id,
    product_code,
    product_name,
    quantity,
    expire_date,
    adjustment_type,
  } = stockData;

  await prisma.$executeRaw`
    CALL create_stock_adjustment(
      ${Number(product_id)},
      ${product_code},
      ${product_name},
      ${Number(quantity)},
      ${expire_date ? new Date(expire_date) : null},
      ${adjustment_type}
    )
  `;
};

const updateStockAdjustment = async (id, stockData) => {
  const {
    product_id,
    product_code,
    product_name,
    quantity,
    expire_date,
    adjustment_type,
  } = stockData;

  await prisma.$executeRaw`
    CALL update_stock_adjustment(
      ${Number(id)},
      ${Number(product_id)},
      ${product_code},
      ${product_name},
      ${Number(quantity)},
      ${expire_date ? new Date(expire_date) : null},
      ${adjustment_type}
    )
  `;
};

const deleteStockAdjustment = async (id) => {
  await prisma.$executeRaw`CALL delete_stock_adjustment(${Number(id)})`;
};

const getAllStockAdjustments = async () => {
  return prisma.$queryRaw`
    SELECT id, product_id, product_code, product_name, quantity, expire_date, adjustment_type, created_at
    FROM stock_adjustments
    ORDER BY id DESC
  `;
};

const getStockAdjustmentById = async (id) => {
  const adjustments = await prisma.$queryRaw`
    SELECT id, product_id, product_code, product_name, quantity, expire_date, adjustment_type, created_at
    FROM stock_adjustments
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return adjustments[0] || null;
};

module.exports = {
  createStockAdjustment,
  updateStockAdjustment,
  deleteStockAdjustment,
  getAllStockAdjustments,
  getStockAdjustmentById,
};



