const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createCompany = async (data) => {
  await prisma.$executeRaw`
    INSERT INTO companies (
      company_name,
      address,
      contact,
      email,
      logo,
      created_at,
      updated_at
    ) VALUES (
      ${data.company_name},
      ${data.address ?? null},
      ${data.contact ?? null},
      ${data.email ?? null},
      ${data.logo ?? null},
      NOW(),
      NOW()
    )
  `;
};

const updateCompany = async (id, data) => {
  await prisma.$executeRaw`
    UPDATE companies
    SET
      company_name = ${data.company_name},
      address = ${data.address ?? null},
      contact = ${data.contact ?? null},
      email = ${data.email ?? null},
      logo = ${data.logo ?? null},
      updated_at = NOW()
    WHERE id = ${Number(id)}
  `;
};

const deleteCompany = async (id) => {
  await prisma.$executeRaw`DELETE FROM companies WHERE id = ${Number(id)}`;
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



