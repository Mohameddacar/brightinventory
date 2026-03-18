const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const hashPassword = async (password) => {
  return bcrypt.hash(String(password), 10);
};

const createUser = async (data) => {
  const hashedPassword = await hashPassword(data.password);

  await prisma.$executeRaw`
    INSERT INTO users (
      name,
      email,
      password,
      role_id,
      phone,
      status,
      created_at
    ) VALUES (
      ${data.name},
      ${data.email},
      ${hashedPassword},
      ${Number(data.role_id)},
      ${data.phone ?? null},
      ${Boolean(data.status)},
      NOW()
    )
  `;
};

const updateUser = async (id, data) => {
  if (typeof data.password === 'string' && data.password.trim().length > 0) {
    const hashedPassword = await hashPassword(data.password);

    await prisma.$executeRaw`
      UPDATE users
      SET
        name = ${data.name},
        email = ${data.email},
        password = ${hashedPassword},
        role_id = ${Number(data.role_id)},
        phone = ${data.phone ?? null},
        status = ${Boolean(data.status)}
      WHERE id = ${Number(id)}
    `;
    return;
  }

  await prisma.$executeRaw`
    UPDATE users
    SET
      name = ${data.name},
      email = ${data.email},
      role_id = ${Number(data.role_id)},
      phone = ${data.phone ?? null},
      status = ${Boolean(data.status)}
    WHERE id = ${Number(id)}
  `;
};

const deleteUser = async (id) => {
  await prisma.$executeRaw`DELETE FROM users WHERE id = ${Number(id)}`;
};

const getAllUsers = async () => {
  return prisma.$queryRaw`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role_id,
      r.role_name,
      u.phone,
      u.status,
      u.created_at
    FROM users u
    JOIN roles r ON r.id = u.role_id
    ORDER BY u.id DESC
  `;
};

const getUserById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role_id,
      r.role_name,
      u.phone,
      u.status,
      u.created_at
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

const getUserByEmail = async (email) => {
  const rows = await prisma.$queryRaw`
    SELECT id, email
    FROM users
    WHERE LOWER(email) = LOWER(${String(email)})
    LIMIT 1
  `;

  return rows[0] || null;
};

const getUserWithPasswordByEmail = async (email) => {
  const rows = await prisma.$queryRaw`
    SELECT id, name, email, password, role_id, status
    FROM users
    WHERE LOWER(email) = LOWER(${String(email)})
    LIMIT 1
  `;

  return rows[0] || null;
};

const getRoleById = async (id) => {
  const rows = await prisma.$queryRaw`
    SELECT id, role_name
    FROM roles
    WHERE id = ${Number(id)}
    LIMIT 1
  `;

  return rows[0] || null;
};

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  getAllUsers,
  getUserById,
  getUserByEmail,
  getUserWithPasswordByEmail,
  getRoleById,
};



