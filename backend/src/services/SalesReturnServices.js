const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createSalesReturn = async (data) => {
  const {
    transaction_no,
    sale_id,
    customer_id,
    return_date,
    total_amount,
  } = data;

  await prisma.$executeRaw`
    CALL create_sales_return(
      ${data.transaction_no ?? null},
      ${data.sale_id ?? null},
      ${data.customer_id ?? null},
      ${data.return_date ?? null},
      ${data.total_amount ?? null}
    )
  `;
};

const updateSalesReturn = async (id, data) => {
  const {
    transaction_no,
    sale_id,
    customer_id,
    return_date,
    total_amount,
  } = data;

  await prisma.$executeRaw`
    CALL update_sales_return(
      ${Number(id)},
      ${data.transaction_no ?? null},
      ${data.sale_id ?? null},
      ${data.customer_id ?? null},
      ${data.return_date ?? null},
      ${data.total_amount ?? null}
    )
  `;
};

const deleteSalesReturn = async (id) => {
  await prisma.$executeRaw`CALL delete_sales_return(${Number(id)})`;
};

const getAllSalesReturns = async () => {
  return prisma.$queryRaw`
    SELECT *
    FROM sales_returns
    ORDER BY id DESC
  `;
};

const getSalesReturnById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT *
    FROM sales_returns
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createSalesReturn,
  updateSalesReturn,
  deleteSalesReturn,
  getAllSalesReturns,
  getSalesReturnById,
};



