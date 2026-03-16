const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createCustomer = async (customerData) => {
  await prisma.$executeRaw`
    INSERT INTO customers (
      full_name,
      gender,
      address,
      mobile_no,
      email,
      customer_type,
      sponsor_id,
      opening_balance,
      balance_type,
      registered_date
    ) VALUES (
      ${customerData.full_name},
      ${customerData.gender ?? null},
      ${customerData.address ?? null},
      ${customerData.mobile_no ?? null},
      ${customerData.email ?? null},
      ${customerData.customer_type ?? null},
      ${customerData.sponsor_id !== undefined && customerData.sponsor_id !== null ? Number(customerData.sponsor_id) : null},
      ${customerData.opening_balance !== undefined && customerData.opening_balance !== null ? Number(customerData.opening_balance) : 0},
      ${customerData.balance_type},
      ${customerData.registered_date ? new Date(customerData.registered_date) : new Date()}
    )
  `;
};

const updateCustomer = async (id, customerData) => {
  await prisma.$executeRaw`
    UPDATE customers
    SET
      full_name = ${customerData.full_name},
      gender = ${customerData.gender ?? null},
      address = ${customerData.address ?? null},
      mobile_no = ${customerData.mobile_no ?? null},
      email = ${customerData.email ?? null},
      customer_type = ${customerData.customer_type ?? null},
      sponsor_id = ${customerData.sponsor_id !== undefined && customerData.sponsor_id !== null ? Number(customerData.sponsor_id) : null},
      opening_balance = ${customerData.opening_balance !== undefined && customerData.opening_balance !== null ? Number(customerData.opening_balance) : 0},
      balance_type = ${customerData.balance_type},
      registered_date = ${customerData.registered_date ? new Date(customerData.registered_date) : null}
    WHERE id = ${Number(id)}
  `;
};

const deleteCustomer = async (id) => {
  await prisma.$executeRaw`DELETE FROM customers WHERE id = ${Number(id)}`;
};

const getAllCustomers = async () => {
  return prisma.$queryRaw`
    SELECT c.id, c.full_name, c.gender, c.address, c.mobile_no, c.email, c.customer_type, c.sponsor_id,
           c.opening_balance, c.balance_type, c.registered_date, c.created_at,
           s.full_name AS sponsor_name
    FROM customers c
    LEFT JOIN sponsors s ON s.id = c.sponsor_id
    ORDER BY c.id DESC
  `;
};

const getCustomerById = async (id) => {
  const customers = await prisma.$queryRaw`
    SELECT c.id, c.full_name, c.gender, c.address, c.mobile_no, c.email, c.customer_type, c.sponsor_id,
           c.opening_balance, c.balance_type, c.registered_date, c.created_at,
           s.full_name AS sponsor_name
    FROM customers c
    LEFT JOIN sponsors s ON s.id = c.sponsor_id
    WHERE c.id = ${Number(id)}
    LIMIT 1
  `;

  return customers[0] || null;
};

module.exports = {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getAllCustomers,
  getCustomerById,
};



