const { PrismaClient, Prisma } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const normalizeType = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

const buildSearchWhere = (search) => {
  const safeSearch = String(search || '').trim().toLowerCase();
  if (!safeSearch) {
    return Prisma.empty;
  }

  const pattern = `%${safeSearch}%`;
  return Prisma.sql`WHERE LOWER(type) LIKE ${pattern}`;
};

const createPaymentMethod = async (payload) => {
  const type = normalizeType(payload.type);

  const duplicate = await prisma.$queryRaw`
    SELECT id
    FROM payment_methods
    WHERE LOWER(type) = LOWER(${type})
    LIMIT 1
  `;

  if (duplicate.length > 0) {
    const error = new Error('Payment method type already exists');
    error.code = 'DUPLICATE_PAYMENT_METHOD_TYPE';
    throw error;
  }

  const created = await prisma.$queryRaw`
    INSERT INTO payment_methods (type)
    VALUES (${type})
    RETURNING id, type, created_at
  `;

  return created[0] || null;
};

const getPaymentMethods = async ({ search, page, limit }) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const whereClause = buildSearchWhere(search);

  const rows = await prisma.$queryRaw`
    SELECT id, type, created_at
    FROM payment_methods
    ${whereClause}
    ORDER BY id DESC
    LIMIT ${safeLimit}
    OFFSET ${offset}
  `;

  const countRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM payment_methods
    ${whereClause}
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

const getPaymentMethodById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT id, type, created_at
    FROM payment_methods
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

const updatePaymentMethod = async (id, payload) => {
  const type = normalizeType(payload.type);

  const duplicate = await prisma.$queryRaw`
    SELECT id
    FROM payment_methods
    WHERE LOWER(type) = LOWER(${type})
      AND id <> ${Number(id)}
    LIMIT 1
  `;

  if (duplicate.length > 0) {
    const error = new Error('Payment method type already exists');
    error.code = 'DUPLICATE_PAYMENT_METHOD_TYPE';
    throw error;
  }

  const updated = await prisma.$queryRaw`
    UPDATE payment_methods
    SET type = ${type}
    WHERE id = ${Number(id)}
    RETURNING id, type, created_at
  `;

  return updated[0] || null;
};

const deletePaymentMethod = async (id) => {
  await prisma.$executeRaw`
    DELETE FROM payment_methods
    WHERE id = ${Number(id)}
  `;
};

module.exports = {
  createPaymentMethod,
  getPaymentMethods,
  getPaymentMethodById,
  updatePaymentMethod,
  deletePaymentMethod,
};
