const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createAuditLog = async (data) => {
  const {
    user_id,
    action,
    table_name,
    record_id,
  } = data;

  await prisma.$executeRaw`
    CALL create_audit_log(
      ${data.user_id ?? null},
      ${data.action ?? null},
      ${data.table_name ?? null},
      ${data.record_id ?? null}
    )
  `;
};

const updateAuditLog = async (id, data) => {
  const {
    user_id,
    action,
    table_name,
    record_id,
  } = data;

  await prisma.$executeRaw`
    CALL update_audit_log(
      ${Number(id)},
      ${data.user_id ?? null},
      ${data.action ?? null},
      ${data.table_name ?? null},
      ${data.record_id ?? null}
    )
  `;
};

const deleteAuditLog = async (id) => {
  await prisma.$executeRaw`CALL delete_audit_log(${Number(id)})`;
};

const getAllAuditLogs = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM audit_logs
    ORDER BY id DESC
  `;
};

const getAuditLogById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM audit_logs
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createAuditLog,
  updateAuditLog,
  deleteAuditLog,
  getAllAuditLogs,
  getAuditLogById,
};



