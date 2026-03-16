const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createCompany = async (data) => {
  const {
    company_name,
    address,
    contact,
    email,
    logo,
  } = data;

  await prisma.$executeRaw`
    CALL create_company(
      ${data.company_name ?? null},
      ${data.address ?? null},
      ${data.contact ?? null},
      ${data.email ?? null},
      ${data.logo ?? null}
    )
  `;
};

const updateCompany = async (id, data) => {
  const {
    company_name,
    address,
    contact,
    email,
    logo,
  } = data;

  await prisma.$executeRaw`
    CALL update_company(
      ${Number(id)},
      ${data.company_name ?? null},
      ${data.address ?? null},
      ${data.contact ?? null},
      ${data.email ?? null},
      ${data.logo ?? null}
    )
  `;
};

const deleteCompany = async (id) => {
  await prisma.$executeRaw`CALL delete_company(${Number(id)})`;
};

const getAllCompanies = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM companies
    ORDER BY id DESC
  `;
};

const getCompanyById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM companies
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createCompany,
  updateCompany,
  deleteCompany,
  getAllCompanies,
  getCompanyById,
};



