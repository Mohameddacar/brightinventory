const { PrismaClient, Prisma } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const mapAccountInput = (payload) => ({
  account_name: String(payload.account_name || '').trim(),
  account_number: String(payload.account_number || '').trim(),
  opening_balance: Number(payload.opening_balance),
  currency: String(payload.currency || 'USD').trim().toUpperCase() || 'USD',
  remarks: payload.remarks ? String(payload.remarks).trim() : null,
});

const buildSearchWhere = (search) => {
  const safeSearch = String(search || '').trim().toLowerCase();
  if (!safeSearch) {
    return Prisma.empty;
  }

  const pattern = `%${safeSearch}%`;
  return Prisma.sql`
    WHERE LOWER(account_name) LIKE ${pattern}
       OR LOWER(account_number) LIKE ${pattern}
  `;
};

const createAccount = async (payload) => {
  const input = mapAccountInput(payload);

  const duplicate = await prisma.$queryRaw`
    SELECT id
    FROM accounts
    WHERE LOWER(account_number) = LOWER(${input.account_number})
    LIMIT 1
  `;

  if (duplicate.length > 0) {
    const error = new Error('Account number already exists');
    error.code = 'DUPLICATE_ACCOUNT_NUMBER';
    throw error;
  }

  const created = await prisma.$queryRaw`
    INSERT INTO accounts (
      account_name,
      account_number,
      opening_balance,
      balance,
      currency,
      remarks
    ) VALUES (
      ${input.account_name},
      ${input.account_number},
      ${input.opening_balance},
      ${input.opening_balance},
      ${input.currency},
      ${input.remarks}
    )
    RETURNING id, account_name, account_number, opening_balance, balance, currency, remarks, created_at
  `;

  return created[0] || null;
};

const getAccounts = async ({ search, page, limit }) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const whereClause = buildSearchWhere(search);

  const rows = await prisma.$queryRaw`
    SELECT id, account_name, account_number, opening_balance, balance, currency, remarks, created_at
    FROM accounts
    ${whereClause}
    ORDER BY id DESC
    LIMIT ${safeLimit}
    OFFSET ${offset}
  `;

  const countRows = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total
    FROM accounts
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

const getAccountById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT id, account_name, account_number, opening_balance, balance, currency, remarks, created_at
    FROM accounts
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

const updateAccount = async (id, payload) => {
  const accountId = Number(id);
  const account_name = String(payload.account_name || '').trim();
  const remarks = payload.remarks ? String(payload.remarks).trim() : null;

  const updated = await prisma.$queryRaw`
    UPDATE accounts
    SET
      account_name = ${account_name},
      remarks = ${remarks}
    WHERE id = ${accountId}
    RETURNING id, account_name, account_number, opening_balance, balance, currency, remarks, created_at
  `;

  return updated[0] || null;
};

const deleteAccount = async (id) => {
  await prisma.$executeRaw`
    DELETE FROM accounts
    WHERE id = ${Number(id)}
  `;
};

module.exports = {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
};
