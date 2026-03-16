const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createSupplier = async (supplierData) => {
  const {
    full_name,
    address,
    mobile_no,
    email,
    opening_balance,
    balance_type,
    registered_date,
  } = supplierData;

  await prisma.$executeRaw`
    CALL create_supplier(
      ${full_name},
      ${address ?? null},
      ${mobile_no ?? null},
      ${email ?? null},
      ${opening_balance !== undefined && opening_balance !== null ? Number(opening_balance) : null},
      ${balance_type},
      ${new Date(registered_date)}
    )
  `;
};

const updateSupplier = async (id, supplierData) => {
  const {
    full_name,
    address,
    mobile_no,
    email,
    opening_balance,
    balance_type,
    registered_date,
  } = supplierData;

  await prisma.$executeRaw`
    CALL update_supplier(
      ${Number(id)},
      ${full_name},
      ${address ?? null},
      ${mobile_no ?? null},
      ${email ?? null},
      ${opening_balance !== undefined && opening_balance !== null ? Number(opening_balance) : null},
      ${balance_type},
      ${new Date(registered_date)}
    )
  `;
};

const deleteSupplier = async (id) => {
  await prisma.$executeRaw`CALL delete_supplier(${Number(id)})`;
};

const getAllSuppliers = async () => {
  return prisma.$queryRaw`
    SELECT id, full_name, address, mobile_no, email, opening_balance, balance_type, registered_date, created_at
    FROM suppliers
    ORDER BY id DESC
  `;
};

const getSupplierById = async (id) => {
  const suppliers = await prisma.$queryRaw`
    SELECT id, full_name, address, mobile_no, email, opening_balance, balance_type, registered_date, created_at
    FROM suppliers
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return suppliers[0] || null;
};

module.exports = {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getAllSuppliers,
  getSupplierById,
};



