const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const {
  ensureInventorySchema,
  createStockAdjustment: createInventoryAdjustment,
  getStockMovements,
} = require('./InventoryServices');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createStockAdjustment = async (stockData) => {
  await ensureInventorySchema();

  const qty = Number(stockData.adjustment_quantity ?? stockData.quantity ?? 0);
  const normalizedQty = Number.isFinite(qty)
    ? Math.trunc(qty)
    : String(stockData.adjustment_type || '').toLowerCase() === 'decrease'
      ? -Math.trunc(Number(stockData.quantity || 0))
      : Math.trunc(Number(stockData.quantity || 0));

  const created = await createInventoryAdjustment({
    product_id: stockData.product_id,
    warehouse_id: stockData.warehouse_id,
    adjustment_quantity: normalizedQty,
    reason: stockData.reason || stockData.note || null,
  });

  return created;
};

const updateStockAdjustment = async () => {
  const error = new Error('Stock adjustments are immutable. Create a new adjustment entry instead.');
  error.code = 'IMMUTABLE_STOCK_ADJUSTMENT';
  throw error;
};

const deleteStockAdjustment = async () => {
  const error = new Error('Stock adjustments cannot be deleted for audit integrity.');
  error.code = 'IMMUTABLE_STOCK_ADJUSTMENT';
  throw error;
};

const getAllStockAdjustments = async () => {
  const result = await getStockMovements({ type: 'ADJUSTMENT', page: 1, limit: 1000 });

  return result.data.map((row) => ({
    id: Number(row.id),
    product_id: Number(row.product_id),
    product_name: row.product_name,
    warehouse_id: Number(row.warehouse_id),
    warehouse_name: row.warehouse_name,
    quantity: Number(row.quantity),
    note: row.note,
    created_at: row.created_at,
  }));
};

const getStockAdjustmentById = async (id) => {
  await ensureInventorySchema();

  const rows = await prisma.$queryRaw`
    SELECT
      sm.id,
      sm.product_id,
      p.product_name,
      sm.warehouse_id,
      w.warehouse_name,
      sm.quantity,
      sm.note,
      sm.created_at
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    JOIN warehouses w ON w.id = sm.warehouse_id
    WHERE sm.type = 'ADJUSTMENT'::stock_movement_type
      AND sm.id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createStockAdjustment,
  updateStockAdjustment,
  deleteStockAdjustment,
  getAllStockAdjustments,
  getStockAdjustmentById,
};



