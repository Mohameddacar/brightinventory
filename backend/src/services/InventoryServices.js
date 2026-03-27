const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

let inventorySchemaReady = false;

const toInt = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.trunc(parsed);
};

const toPositiveInt = (value, fallback = 1) => {
  const parsed = toInt(value, fallback);
  return parsed > 0 ? parsed : fallback;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ensureInventorySchema = async () => {
  if (inventorySchemaReady) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id SERIAL PRIMARY KEY,
      warehouse_name VARCHAR(120) NOT NULL,
      location VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO warehouses (warehouse_name, location)
    SELECT 'main', 'main'
    WHERE NOT EXISTS (SELECT 1 FROM warehouses);

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
        CREATE TYPE stock_movement_type AS ENUM ('IN', 'OUT', 'ADJUSTMENT');
      END IF;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_reference_type') THEN
        CREATE TYPE stock_reference_type AS ENUM ('PURCHASE', 'SALE', 'SALES_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT');
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id),
      warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
      quantity_on_hand INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_inventory_product_warehouse UNIQUE (product_id, warehouse_id)
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory (product_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id ON inventory (warehouse_id);

    CREATE TABLE IF NOT EXISTS stock_movements (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id),
      warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
      type stock_movement_type NOT NULL,
      quantity INTEGER NOT NULL,
      reference_type stock_reference_type NOT NULL,
      reference_id INTEGER,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_stock_movements_product_warehouse ON stock_movements (product_id, warehouse_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements (reference_type, reference_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements (created_at DESC);

    INSERT INTO inventory (product_id, warehouse_id, quantity_on_hand, created_at, updated_at)
    SELECT
      p.id,
      w.id,
      GREATEST(COALESCE(p.current_stock, p.opening_quantity, 0), 0),
      NOW(),
      NOW()
    FROM products p
    CROSS JOIN LATERAL (
      SELECT id FROM warehouses ORDER BY id ASC LIMIT 1
    ) w
    WHERE NOT EXISTS (
      SELECT 1
      FROM inventory i
      WHERE i.product_id = p.id
    );

    UPDATE products p
    SET current_stock = COALESCE(agg.qty, 0)
    FROM (
      SELECT product_id, SUM(quantity_on_hand)::INTEGER AS qty
      FROM inventory
      GROUP BY product_id
    ) agg
    WHERE agg.product_id = p.id;

    UPDATE products
    SET current_stock = 0
    WHERE NOT EXISTS (
      SELECT 1
      FROM inventory i
      WHERE i.product_id = products.id
    );
  `);

  inventorySchemaReady = true;
};

const resolveWarehouseId = async (tx, requestedWarehouseId) => {
  const parsed = toInt(requestedWarehouseId, 0);
  if (parsed > 0) {
    return parsed;
  }

  const rows = await tx.$queryRaw`
    SELECT id
    FROM warehouses
    ORDER BY id ASC
    LIMIT 1
  `;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No warehouse found. Create a warehouse before stock operations.');
  }

  return Number(rows[0].id);
};

const syncProductCurrentStock = async (tx, productId) => {
  await tx.$executeRaw`
    UPDATE products p
    SET
      current_stock = COALESCE(agg.qty, 0),
      updated_at = NOW()
    FROM (
      SELECT SUM(quantity_on_hand)::INTEGER AS qty
      FROM inventory
      WHERE product_id = ${Number(productId)}
    ) agg
    WHERE p.id = ${Number(productId)}
  `;
};

const applyMovement = async (
  tx,
  {
    product_id,
    warehouse_id,
    delta,
    movement_type,
    movement_quantity,
    reference_type,
    reference_id,
    note,
    allowZero = false,
  }
) => {
  const productId = toInt(product_id, 0);
  if (productId <= 0) {
    throw new Error('product_id is required');
  }

  const resolvedWarehouseId = await resolveWarehouseId(tx, warehouse_id);
  const signedDelta = toInt(delta, 0);

  if (signedDelta === 0 && !allowZero) {
    return;
  }

  const rows = await tx.$queryRaw`
    SELECT id, quantity_on_hand
    FROM inventory
    WHERE product_id = ${productId} AND warehouse_id = ${resolvedWarehouseId}
    LIMIT 1
  `;

  const existingQty = Array.isArray(rows) && rows.length > 0 ? toInt(rows[0].quantity_on_hand, 0) : 0;
  const nextQty = existingQty + signedDelta;

  if (nextQty < 0) {
    const productRows = await tx.$queryRaw`
      SELECT product_name
      FROM products
      WHERE id = ${productId}
      LIMIT 1
    `;

    const productName = Array.isArray(productRows) && productRows[0]?.product_name
      ? String(productRows[0].product_name)
      : `Product ${productId}`;

    const error = new Error(`${productName}: insufficient stock. Available ${existingQty}, required ${Math.abs(signedDelta)}.`);
    error.code = 'LOW_STOCK';
    error.meta = {
      product_id: productId,
      warehouse_id: resolvedWarehouseId,
      available: existingQty,
      required: Math.abs(signedDelta),
    };
    throw error;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    await tx.$executeRaw`
      INSERT INTO inventory (
        product_id,
        warehouse_id,
        quantity_on_hand,
        created_at,
        updated_at
      ) VALUES (
        ${productId},
        ${resolvedWarehouseId},
        ${nextQty},
        NOW(),
        NOW()
      )
    `;
  } else {
    await tx.$executeRaw`
      UPDATE inventory
      SET
        quantity_on_hand = ${nextQty},
        updated_at = NOW()
      WHERE id = ${Number(rows[0].id)}
    `;
  }

  const movementQty = toInt(
    movement_quantity,
    movement_type === 'ADJUSTMENT' ? signedDelta : Math.abs(signedDelta)
  );

  await tx.$executeRawUnsafe(
    `
      INSERT INTO stock_movements (
        product_id,
        warehouse_id,
        type,
        quantity,
        reference_type,
        reference_id,
        note,
        created_at
      ) VALUES ($1, $2, $3::stock_movement_type, $4, $5::stock_reference_type, $6, $7, NOW())
    `,
    productId,
    resolvedWarehouseId,
    movement_type,
    movementQty,
    reference_type,
    reference_id ? toInt(reference_id, null) : null,
    note ?? null
  );

  await syncProductCurrentStock(tx, productId);
};

const applyMovementBatch = async (tx, movements) => {
  for (const movement of movements) {
    await applyMovement(tx, movement);
  }
};

const getInventoryOverview = async ({ search, warehouse_id } = {}) => {
  await ensureInventorySchema();

  const clauses = [];
  const params = [];

  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    clauses.push(`(p.product_name ILIKE $${params.length} OR p.product_code ILIKE $${params.length})`);
  }

  const warehouseId = toInt(warehouse_id, 0);
  if (warehouseId > 0) {
    params.push(warehouseId);
    clauses.push(`i.warehouse_id = $${params.length}`);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  return prisma.$queryRawUnsafe(
    `
      SELECT
        i.id,
        i.product_id,
        p.product_name,
        p.product_code,
        p.stock_alert,
        i.warehouse_id,
        w.warehouse_name,
        i.quantity_on_hand,
        CASE
          WHEN i.quantity_on_hand <= COALESCE(p.stock_alert, 0) THEN 'LOW'
          ELSE 'NORMAL'
        END AS stock_status,
        i.updated_at
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      JOIN warehouses w ON w.id = i.warehouse_id
      ${whereSql}
      ORDER BY p.product_name ASC, w.warehouse_name ASC
    `,
    ...params
  );
};

const getProductStockById = async (productId) => {
  await ensureInventorySchema();

  const parsed = toInt(productId, 0);
  if (parsed <= 0) {
    throw new Error('Valid product id is required');
  }

  const productRows = await prisma.$queryRaw`
    SELECT id, product_name, product_code
    FROM products
    WHERE id = ${parsed}
    LIMIT 1
  `;

  if (!Array.isArray(productRows) || productRows.length === 0) {
    throw new Error('Product not found');
  }

  const byWarehouse = await prisma.$queryRaw`
    SELECT
      i.warehouse_id,
      w.warehouse_name,
      i.quantity_on_hand
    FROM inventory i
    JOIN warehouses w ON w.id = i.warehouse_id
    WHERE i.product_id = ${parsed}
    ORDER BY w.warehouse_name ASC
  `;

  const totalStock = byWarehouse.reduce((sum, row) => sum + toInt(row.quantity_on_hand, 0), 0);

  return {
    product: productRows[0],
    total_stock: totalStock,
    by_warehouse: byWarehouse.map((row) => ({
      warehouse_id: Number(row.warehouse_id),
      warehouse_name: String(row.warehouse_name),
      quantity_on_hand: toInt(row.quantity_on_hand, 0),
    })),
  };
};

const getStockMovements = async ({ page, limit, product_id, type, start_date, end_date } = {}) => {
  await ensureInventorySchema();

  const safePage = Math.max(1, toInt(page, 1));
  const safeLimit = Math.min(100, Math.max(1, toInt(limit, 20)));
  const offset = (safePage - 1) * safeLimit;

  const clauses = [];
  const params = [];

  const productId = toInt(product_id, 0);
  if (productId > 0) {
    params.push(productId);
    clauses.push(`sm.product_id = $${params.length}`);
  }

  if (type && ['IN', 'OUT', 'ADJUSTMENT'].includes(String(type).toUpperCase())) {
    params.push(String(type).toUpperCase());
    clauses.push(`sm.type = $${params.length}::stock_movement_type`);
  }

  if (start_date) {
    params.push(new Date(start_date));
    clauses.push(`sm.created_at >= $${params.length}`);
  }

  if (end_date) {
    params.push(new Date(end_date));
    clauses.push(`sm.created_at <= $${params.length}`);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRows = await prisma.$queryRawUnsafe(
    `
      SELECT COUNT(*)::INTEGER AS total
      FROM stock_movements sm
      ${whereSql}
    `,
    ...params
  );

  const total = Array.isArray(countRows) && countRows[0] ? toInt(countRows[0].total, 0) : 0;

  const data = await prisma.$queryRawUnsafe(
    `
      SELECT
        sm.id,
        sm.created_at,
        sm.product_id,
        p.product_name,
        sm.warehouse_id,
        w.warehouse_name,
        sm.type,
        sm.quantity,
        sm.reference_type,
        sm.reference_id,
        sm.note
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      JOIN warehouses w ON w.id = sm.warehouse_id
      ${whereSql}
      ORDER BY sm.created_at DESC, sm.id DESC
      LIMIT ${safeLimit}
      OFFSET ${offset}
    `,
    ...params
  );

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

const createStockAdjustment = async (payload = {}) => {
  await ensureInventorySchema();

  const productId = toInt(payload.product_id, 0);
  const warehouseId = toInt(payload.warehouse_id, 0);
  const adjustmentQuantity = toInt(payload.adjustment_quantity, 0);

  if (productId <= 0) {
    throw new Error('product_id is required');
  }

  if (warehouseId <= 0) {
    throw new Error('warehouse_id is required');
  }

  if (adjustmentQuantity === 0) {
    throw new Error('adjustment_quantity cannot be 0');
  }

  const reason = payload.reason ? String(payload.reason).trim() : null;

  return prisma.$transaction(async (tx) => {
    await applyMovement(tx, {
      product_id: productId,
      warehouse_id: warehouseId,
      delta: adjustmentQuantity,
      movement_type: 'ADJUSTMENT',
      movement_quantity: adjustmentQuantity,
      reference_type: 'ADJUSTMENT',
      reference_id: null,
      note: reason,
    });

    const rows = await tx.$queryRaw`
      SELECT
        i.product_id,
        i.warehouse_id,
        i.quantity_on_hand,
        p.product_name,
        w.warehouse_name
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      JOIN warehouses w ON w.id = i.warehouse_id
      WHERE i.product_id = ${productId} AND i.warehouse_id = ${warehouseId}
      LIMIT 1
    `;

    return rows[0] || null;
  });
};

module.exports = {
  ensureInventorySchema,
  applyMovement,
  applyMovementBatch,
  resolveWarehouseId,
  getInventoryOverview,
  getProductStockById,
  getStockMovements,
  createStockAdjustment,
  prisma,
  toNumber,
};
