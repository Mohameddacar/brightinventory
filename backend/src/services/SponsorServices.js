const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createSponsor = async (data) => {
  await prisma.$executeRaw`
    INSERT INTO sponsors (
      full_name,
      gender,
      address,
      mobile_no,
      email,
      registered_date
    ) VALUES (
      ${data.full_name ?? null},
      ${data.gender ?? null},
      ${data.address ?? null},
      ${data.mobile_no ?? null},
      ${data.email ?? null},
      ${data.registered_date ? new Date(data.registered_date) : new Date()}
    )
  `;
};

const updateSponsor = async (id, data) => {
  await prisma.$executeRaw`
    UPDATE sponsors
    SET
      full_name = ${data.full_name ?? null},
      gender = ${data.gender ?? null},
      address = ${data.address ?? null},
      mobile_no = ${data.mobile_no ?? null},
      email = ${data.email ?? null},
      registered_date = ${data.registered_date ? new Date(data.registered_date) : null}
    WHERE id = ${Number(id)}
  `;
};

const deleteSponsor = async (id) => {
  await prisma.$executeRaw`DELETE FROM sponsors WHERE id = ${Number(id)}`;
};

const getAllSponsors = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM sponsors
    ORDER BY id DESC
  `;
};

const getSponsorById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM sponsors
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createSponsor,
  updateSponsor,
  deleteSponsor,
  getAllSponsors,
  getSponsorById,
};



