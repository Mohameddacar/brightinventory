const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createCategory = async (name, description = null) => {
	await prisma.$executeRaw`CALL create_category(${name}, ${description})`;
};

const updateCategory = async (id, name, description = null) => {
	await prisma.$executeRaw`CALL update_category(${id}, ${name}, ${description})`;
};

const deleteCategory = async (id) => {
	await prisma.$executeRaw`CALL delete_category(${id})`;
};

const getAllCategories = async () => {
	return prisma.$queryRaw`
		SELECT
			id,
			category_name,
			category_name AS name,
			description,
			created_at,
			created_at AS "createdAt"
		FROM categories
		ORDER BY id DESC
	`;
};

module.exports = {
	createCategory,
	updateCategory,
	deleteCategory,
	getAllCategories,
};



