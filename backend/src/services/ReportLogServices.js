const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createReportLog = async (data) => {
  const {
    report_name,
    generated_by,
  } = data;

  await prisma.$executeRaw`
    CALL create_report_log(
      ${data.report_name ?? null},
      ${data.generated_by ?? null}
    )
  `;
};

const createSystemReportLog = async ({ report_name, generated_by }) => {
  const name = String(report_name || '').trim();
  const userId = Number(generated_by);

  if (!name || !Number.isFinite(userId) || userId <= 0) {
    return;
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO report_logs (report_name, generated_by)
      VALUES (${name}, ${userId})
    `;
  } catch {
    // Fallback to stored procedure in environments that enforce DB routines.
    await createReportLog({ report_name: name, generated_by: userId });
  }
};

const updateReportLog = async (id, data) => {
  const {
    report_name,
    generated_by,
  } = data;

  await prisma.$executeRaw`
    CALL update_report_log(
      ${Number(id)},
      ${data.report_name ?? null},
      ${data.generated_by ?? null}
    )
  `;
};

const deleteReportLog = async (id) => {
  await prisma.$executeRaw`CALL delete_report_log(${Number(id)})`;
};

const getAllReportLogs = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM report_logs
    ORDER BY id DESC
  `;
};

const getReportLogById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM report_logs
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createReportLog,
  updateReportLog,
  deleteReportLog,
  getAllReportLogs,
  getReportLogById,
  createSystemReportLog,
};



