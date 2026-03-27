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

const getReturnWarehouse = async (tx, purchaseReturnId) => {
  const rows = await tx.$queryRaw`
    SELECT p.warehouse_id
    FROM purchase_returns pr
    JOIN purchases p ON p.id = pr.purchase_id
    WHERE pr.id = ${Number(purchaseReturnId)}
    LIMIT 1
  `;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Purchase return not found');
  }

  return resolveWarehouseId(tx, rows[0].warehouse_id);
};

const createPurchaseReturnItem = async (data) => {
  await ensureInventorySchema();

  const purchaseReturnId = toInt(data.purchase_return_id, 0);
  const productId = toInt(data.product_id, 0);
  const quantity = toInt(data.quantity, 0);
  const amount = Number(data.amount || 0);

  if (purchaseReturnId <= 0 || productId <= 0 || quantity <= 0) {
    throw new Error('purchase_return_id, product_id and quantity are required');
  }

  await prisma.$transaction(async (tx) => {
    const warehouseId = await getReturnWarehouse(tx, purchaseReturnId);

    await tx.$executeRaw`
      INSERT INTO purchase_return_items (
        purchase_return_id,
        product_id,
        quantity,
        amount
      ) VALUES (
        ${purchaseReturnId},
        ${productId},
        ${quantity},
        ${amount}
      )
    `;

    await applyMovement(tx, {
      product_id: productId,
      warehouse_id: warehouseId,
      delta: -quantity,
      movement_type: 'OUT',
      movement_quantity: quantity,
      reference_type: 'PURCHASE_RETURN',
      reference_id: purchaseReturnId,
      note: 'Purchase return item created',
    });
  });
};

const updatePurchaseReturnItem = async (id, data) => {
  await ensureInventorySchema();

  const itemId = Number(id);
  const nextPurchaseReturnId = toInt(data.purchase_return_id, 0);
  const nextProductId = toInt(data.product_id, 0);
  const nextQuantity = toInt(data.quantity, 0);
  const nextAmount = Number(data.amount || 0);

  if (nextPurchaseReturnId <= 0 || nextProductId <= 0 || nextQuantity <= 0) {
    throw new Error('purchase_return_id, product_id and quantity are required');
  }

  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id, purchase_return_id, product_id, quantity
      FROM purchase_return_items
      WHERE id = ${itemId}
      LIMIT 1
    `;

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Purchase return item not found');
    }

    const current = rows[0];
    const prevReturnId = Number(current.purchase_return_id);
    const prevProductId = Number(current.product_id);
    const prevQuantity = toInt(current.quantity, 0);

    const prevWarehouseId = await getReturnWarehouse(tx, prevReturnId);
    const nextWarehouseId = await getReturnWarehouse(tx, nextPurchaseReturnId);

    if (prevProductId === nextProductId && prevWarehouseId === nextWarehouseId) {
      const delta = prevQuantity - nextQuantity;
      if (delta !== 0) {
        await applyMovement(tx, {
          product_id: nextProductId,
          warehouse_id: nextWarehouseId,
          delta,
          movement_type: delta > 0 ? 'IN' : 'OUT',
          movement_quantity: Math.abs(delta),
          reference_type: 'PURCHASE_RETURN',
          reference_id: nextPurchaseReturnId,
          note: 'Purchase return item updated',
        });
      }
    } else {
      if (prevQuantity > 0) {
        await applyMovement(tx, {
          product_id: prevProductId,
          warehouse_id: prevWarehouseId,
          delta: prevQuantity,
          movement_type: 'IN',
          movement_quantity: prevQuantity,
          reference_type: 'PURCHASE_RETURN',
          reference_id: prevReturnId,
          note: 'Purchase return item revert before update',
        });
      }

      await applyMovement(tx, {
        product_id: nextProductId,
        warehouse_id: nextWarehouseId,
        delta: -nextQuantity,
        movement_type: 'OUT',
        movement_quantity: nextQuantity,
        reference_type: 'PURCHASE_RETURN',
        reference_id: nextPurchaseReturnId,
        note: 'Purchase return item apply after update',
      });
    }

    await tx.$executeRaw`
      UPDATE purchase_return_items
      SET
        purchase_return_id = ${nextPurchaseReturnId},
        product_id = ${nextProductId},
        quantity = ${nextQuantity},
        amount = ${nextAmount}
      WHERE id = ${itemId}
    `;
  });
};

const deletePurchaseReturnItem = async (id) => {
  await ensureInventorySchema();

  const itemId = Number(id);
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw`
      SELECT id, purchase_return_id, product_id, quantity
      FROM purchase_return_items
      WHERE id = ${itemId}
      LIMIT 1
    `;

    if (!Array.isArray(rows) || rows.length === 0) {
      return;
    }

    const row = rows[0];
    const warehouseId = await getReturnWarehouse(tx, row.purchase_return_id);
    const quantity = toInt(row.quantity, 0);

    if (quantity > 0) {
      await applyMovement(tx, {
        product_id: Number(row.product_id),
        warehouse_id: warehouseId,
        delta: quantity,
        movement_type: 'IN',
        movement_quantity: quantity,
        reference_type: 'PURCHASE_RETURN',
        reference_id: Number(row.purchase_return_id),
        note: 'Purchase return item deleted',
      });
    }

    await tx.$executeRaw`
      DELETE FROM purchase_return_items
      WHERE id = ${itemId}
    `;
  });
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



