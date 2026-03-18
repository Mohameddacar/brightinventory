const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

let transferSchemaReady = false;

const ensureTransferSchema = async () => {
  if (transferSchemaReady) {
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

    INSERT INTO warehouses (warehouse_name, location)
    SELECT 'secondary', 'secondary'
    WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE LOWER(warehouse_name) = 'secondary');

    CREATE TABLE IF NOT EXISTS stock_transfers (
      id SERIAL PRIMARY KEY,
      transfer_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reference_no VARCHAR(120) NOT NULL UNIQUE,
      from_warehouse_id INTEGER NOT NULL,
      to_warehouse_id INTEGER NOT NULL,
      total_products INTEGER NOT NULL DEFAULT 0,
      grand_total NUMERIC(18,2) NOT NULL DEFAULT 0,
      remarks TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_stock_transfers_transfer_date ON stock_transfers (transfer_date);
    CREATE INDEX IF NOT EXISTS idx_stock_transfers_from_warehouse ON stock_transfers (from_warehouse_id);
    CREATE INDEX IF NOT EXISTS idx_stock_transfers_to_warehouse ON stock_transfers (to_warehouse_id);
  `);

  transferSchemaReady = true;
};

const getWarehouses = async () => {
  await ensureTransferSchema();

  return prisma.$queryRaw`
    SELECT id, warehouse_name, location
    FROM warehouses
    ORDER BY warehouse_name ASC, id ASC
  `;
};

const createTransfer = async (payload) => {
  await ensureTransferSchema();

  const transferDate = new Date(payload.transfer_date);
  const referenceNo = String(payload.reference_no || '').trim();
  const fromWarehouseId = Number(payload.from_warehouse_id);
  const toWarehouseId = Number(payload.to_warehouse_id);
  const totalProducts = Number(payload.total_products);
  const grandTotal = Number(payload.grand_total);
  const remarks = payload.remarks ? String(payload.remarks).trim() : null;

  const duplicate = await prisma.$queryRaw`
    SELECT id
    FROM stock_transfers
    WHERE LOWER(reference_no) = LOWER(${referenceNo})
    LIMIT 1
  `;

  if (duplicate.length > 0) {
    const error = new Error('Reference already exists');
    error.code = 'DUPLICATE_TRANSFER_REFERENCE';
    throw error;
  }

  const createdRows = await prisma.$queryRaw`
    INSERT INTO stock_transfers (
      transfer_date,
      reference_no,
      from_warehouse_id,
      to_warehouse_id,
      total_products,
      grand_total,
      remarks
    ) VALUES (
      ${transferDate},
      ${referenceNo},
      ${fromWarehouseId},
      ${toWarehouseId},
      ${totalProducts},
      ${grandTotal},
      ${remarks}
    )
    RETURNING id
  `;

  const createdId = Number(createdRows[0]?.id || 0);
  return getTransferById(createdId);
};

const getTransfers = async ({ search, page, limit }) => {
  await ensureTransferSchema();

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const query = String(search || '').trim().toLowerCase();

  const pattern = `%${query}%`;

  const rows = query
    ? await prisma.$queryRaw`
        SELECT
          t.id,
          t.transfer_date,
          t.reference_no,
          t.from_warehouse_id,
          COALESCE(fw.warehouse_name, CONCAT('Warehouse #', t.from_warehouse_id::text)) AS from_warehouse_name,
          t.to_warehouse_id,
          COALESCE(tw.warehouse_name, CONCAT('Warehouse #', t.to_warehouse_id::text)) AS to_warehouse_name,
          t.total_products,
          t.grand_total,
          t.remarks,
          t.created_at
        FROM stock_transfers t
        LEFT JOIN warehouses fw ON fw.id = t.from_warehouse_id
        LEFT JOIN warehouses tw ON tw.id = t.to_warehouse_id
        WHERE LOWER(t.reference_no) LIKE ${pattern}
           OR LOWER(COALESCE(fw.warehouse_name, '')) LIKE ${pattern}
           OR LOWER(COALESCE(tw.warehouse_name, '')) LIKE ${pattern}
        ORDER BY t.id DESC
        LIMIT ${safeLimit}
        OFFSET ${offset}
      `
    : await prisma.$queryRaw`
        SELECT
          t.id,
          t.transfer_date,
          t.reference_no,
          t.from_warehouse_id,
          COALESCE(fw.warehouse_name, CONCAT('Warehouse #', t.from_warehouse_id::text)) AS from_warehouse_name,
          t.to_warehouse_id,
          COALESCE(tw.warehouse_name, CONCAT('Warehouse #', t.to_warehouse_id::text)) AS to_warehouse_name,
          t.total_products,
          t.grand_total,
          t.remarks,
          t.created_at
        FROM stock_transfers t
        LEFT JOIN warehouses fw ON fw.id = t.from_warehouse_id
        LEFT JOIN warehouses tw ON tw.id = t.to_warehouse_id
        ORDER BY t.id DESC
        LIMIT ${safeLimit}
        OFFSET ${offset}
      `;

  const countRows = query
    ? await prisma.$queryRaw`
        SELECT COUNT(*)::int AS total
        FROM stock_transfers t
        LEFT JOIN warehouses fw ON fw.id = t.from_warehouse_id
        LEFT JOIN warehouses tw ON tw.id = t.to_warehouse_id
        WHERE LOWER(t.reference_no) LIKE ${pattern}
           OR LOWER(COALESCE(fw.warehouse_name, '')) LIKE ${pattern}
           OR LOWER(COALESCE(tw.warehouse_name, '')) LIKE ${pattern}
      `
    : await prisma.$queryRaw`
        SELECT COUNT(*)::int AS total
        FROM stock_transfers
      `;

  const total = Number(countRows[0]?.total || 0);

  return {
    data: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
};

const getTransferById = async (id) => {
  await ensureTransferSchema();

  const rows = await prisma.$queryRaw`
    SELECT
      t.id,
      t.transfer_date,
      t.reference_no,
      t.from_warehouse_id,
      COALESCE(fw.warehouse_name, CONCAT('Warehouse #', t.from_warehouse_id::text)) AS from_warehouse_name,
      t.to_warehouse_id,
      COALESCE(tw.warehouse_name, CONCAT('Warehouse #', t.to_warehouse_id::text)) AS to_warehouse_name,
      t.total_products,
      t.grand_total,
      t.remarks,
      t.created_at
    FROM stock_transfers t
    LEFT JOIN warehouses fw ON fw.id = t.from_warehouse_id
    LEFT JOIN warehouses tw ON tw.id = t.to_warehouse_id
    WHERE t.id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

const deleteTransfer = async (id) => {
  await ensureTransferSchema();

  await prisma.$executeRaw`
    DELETE FROM stock_transfers
    WHERE id = ${Number(id)}
  `;
};

module.exports = {
  getWarehouses,
  createTransfer,
  getTransfers,
  getTransferById,
  deleteTransfer,
};
