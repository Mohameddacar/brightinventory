const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { ensureInventorySchema, applyMovement, resolveWarehouseId } = require('./InventoryServices');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const toInt = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.trunc(parsed);
};

const getReturnWarehouse = async (tx, salesReturnId) => {
  const rows = await tx.$queryRaw`
    SELECT s.warehouse_id
    FROM sales_returns sr
    JOIN sales s ON s.id = sr.sale_id
    WHERE sr.id = ${Number(salesReturnId)}
    LIMIT 1
  `;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Sales return not found');
  }

  return resolveWarehouseId(tx, rows[0].warehouse_id);
};

const createSalesReturnItem = async (data) => {
  await ensureInventorySchema();

  const salesReturnId = toInt(data.sales_return_id, 0);
  const productId = toInt(data.product_id, 0);
  const quantity = toInt(data.quantity, 0);
  const amount = Number(data.amount || 0);

  if (salesReturnId <= 0 || productId <= 0 || quantity <= 0) {
    throw new Error('sales_return_id, product_id and quantity are required');
  }

  await prisma.$transaction(async (tx) => {
    const warehouseId = await getReturnWarehouse(tx, salesReturnId);

    await tx.$executeRaw`
      INSERT INTO sales_return_items (
        sales_return_id,
        product_id,
        quantity,
        amount
      ) VALUES (
        ${salesReturnId},
        ${productId},
        ${quantity},
        ${amount}
      )
    `;

    await applyMovement(tx, {
      product_id: productId,
      warehouse_id: warehouseId,
      delta: quantity,
      movement_type: 'IN',
      movement_quantity: quantity,
      reference_type: 'SALES_RETURN',
      reference_id: salesReturnId,
      note: 'Sales return item created',
    });
  });
};

const updateSalesReturnItem = async (id, data) => {
  await ensureInventorySchema();

  const itemId = Number(id);
  const nextSalesReturnId = toInt(data.sales_return_id, 0);
  const nextProductId = toInt(data.product_id, 0);
  const nextQuantity = toInt(data.quantity, 0);
  const nextAmount = Number(data.amount || 0);

  if (nextSalesReturnId <= 0 || nextProductId <= 0 || nextQuantity <= 0) {
    throw new Error('sales_return_id, product_id and quantity are required');
  }

  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id, sales_return_id, product_id, quantity
      FROM sales_return_items
      WHERE id = ${itemId}
      LIMIT 1
    `;

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Sales return item not found');
    }

    const current = rows[0];
    const prevReturnId = Number(current.sales_return_id);
    const prevProductId = Number(current.product_id);
    const prevQuantity = toInt(current.quantity, 0);

    const prevWarehouseId = await getReturnWarehouse(tx, prevReturnId);
    const nextWarehouseId = await getReturnWarehouse(tx, nextSalesReturnId);

    if (prevProductId === nextProductId && prevWarehouseId === nextWarehouseId) {
      const delta = nextQuantity - prevQuantity;
      if (delta !== 0) {
        await applyMovement(tx, {
          product_id: nextProductId,
          warehouse_id: nextWarehouseId,
          delta,
          movement_type: delta > 0 ? 'IN' : 'OUT',
          movement_quantity: Math.abs(delta),
          reference_type: 'SALES_RETURN',
          reference_id: nextSalesReturnId,
          note: 'Sales return item updated',
        });
      }
    } else {
      if (prevQuantity > 0) {
        await applyMovement(tx, {
          product_id: prevProductId,
          warehouse_id: prevWarehouseId,
          delta: -prevQuantity,
          movement_type: 'OUT',
          movement_quantity: prevQuantity,
          reference_type: 'SALES_RETURN',
          reference_id: prevReturnId,
          note: 'Sales return item revert before update',
        });
      }

      await applyMovement(tx, {
        product_id: nextProductId,
        warehouse_id: nextWarehouseId,
        delta: nextQuantity,
        movement_type: 'IN',
        movement_quantity: nextQuantity,
        reference_type: 'SALES_RETURN',
        reference_id: nextSalesReturnId,
        note: 'Sales return item apply after update',
      });
    }

    await tx.$executeRaw`
      UPDATE sales_return_items
      SET
        sales_return_id = ${nextSalesReturnId},
        product_id = ${nextProductId},
        quantity = ${nextQuantity},
        amount = ${nextAmount}
      WHERE id = ${itemId}
    `;
  });
};

const deleteSalesReturnItem = async (id) => {
  await ensureInventorySchema();

  const itemId = Number(id);
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id, sales_return_id, product_id, quantity
      FROM sales_return_items
      WHERE id = ${itemId}
      LIMIT 1
    `;

    if (!Array.isArray(rows) || rows.length === 0) {
      return;
    }

    const row = rows[0];
    const warehouseId = await getReturnWarehouse(tx, row.sales_return_id);
    const quantity = toInt(row.quantity, 0);

    if (quantity > 0) {
      await applyMovement(tx, {
        product_id: Number(row.product_id),
        warehouse_id: warehouseId,
        delta: -quantity,
        movement_type: 'OUT',
        movement_quantity: quantity,
        reference_type: 'SALES_RETURN',
        reference_id: Number(row.sales_return_id),
        note: 'Sales return item deleted',
      });
    }

    await tx.$executeRaw`
      DELETE FROM sales_return_items
      WHERE id = ${itemId}
    `;
  });
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



