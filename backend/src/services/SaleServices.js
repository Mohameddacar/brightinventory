const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createSale = async (saleData) => {
  const {
    invoice_no,
    customer_id,
    invoice_date,
    total,
    discount,
    grand_total,
    paid,
    rest,
  } = saleData;

  await prisma.$executeRaw`
    CALL create_sale(
      ${invoice_no},
      ${Number(customer_id)},
      ${new Date(invoice_date)},
      ${Number(total)},
      ${Number(discount)},
      ${Number(grand_total)},
      ${Number(paid)},
      ${Number(rest)}
    )
  `;
};

const updateSale = async (id, saleData) => {
  const {
    invoice_no,
    customer_id,
    invoice_date,
    total,
    discount,
    grand_total,
    paid,
    rest,
  } = saleData;

  await prisma.$executeRaw`
    CALL update_sale(
      ${Number(id)},
      ${invoice_no},
      ${Number(customer_id)},
      ${new Date(invoice_date)},
      ${Number(total)},
      ${Number(discount)},
      ${Number(grand_total)},
      ${Number(paid)},
      ${Number(rest)}
    )
  `;
};

const deleteSale = async (id) => {
  await prisma.$executeRaw`CALL delete_sale(${Number(id)})`;
};

const getAllSales = async () => {
  return prisma.$queryRaw`
    SELECT s.id, s.invoice_no, s.customer_id, c.full_name AS customer_name, s.invoice_date,
           s.total, s.discount, s.grand_total, s.paid, s.rest, s.created_at
    FROM sales s
    JOIN customers c ON c.id = s.customer_id
    ORDER BY s.id DESC
  `;
};

const getSaleById = async (id) => {
  const sales = await prisma.$queryRaw`
    SELECT s.id, s.invoice_no, s.customer_id, c.full_name AS customer_name, s.invoice_date,
           s.total, s.discount, s.grand_total, s.paid, s.rest, s.created_at
    FROM sales s
    JOIN customers c ON c.id = s.customer_id
    WHERE s.id = ${Number(id)}
    LIMIT 1
  `;

  return sales[0] || null;
};

module.exports = {
  createSale,
  updateSale,
  deleteSale,
  getAllSales,
  getSaleById,
};



