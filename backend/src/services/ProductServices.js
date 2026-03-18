const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const createProduct = async (productData) => {
	const {
		category_id,
		product_code,
		product_name,
		description,
		image,
		has_expire_date,
		expire_date,
		opening_quantity,
		minimum_sale_quantity,
		stock_alert,
		purchase_cost,
		sale_cost,
		reorder_level,
	} = productData;

	await prisma.$executeRaw`
		CALL create_product(
			${Number(category_id)},
			${product_code},
			${product_name},
			${description ?? null},
			${image ?? null},
			${Boolean(has_expire_date)},
			${expire_date ? new Date(expire_date) : null},
			${Number(opening_quantity)},
			${Number(minimum_sale_quantity ?? 0)},
			${Number(stock_alert ?? 0)},
			${Number(purchase_cost)},
			${Number(sale_cost)},
			${Number(reorder_level)}
		)
	`;
};

const updateProduct = async (id, productData) => {
	const {
		category_id,
		product_code,
		product_name,
		description,
		image,
		has_expire_date,
		expire_date,
		opening_quantity,
		minimum_sale_quantity,
		stock_alert,
		purchase_cost,
		sale_cost,
		reorder_level,
	} = productData;

	await prisma.$executeRaw`
		CALL update_product(
			${Number(id)},
			${Number(category_id)},
			${product_code},
			${product_name},
			${description ?? null},
			${image ?? null},
			${Boolean(has_expire_date)},
			${expire_date ? new Date(expire_date) : null},
			${Number(opening_quantity)},
			${Number(minimum_sale_quantity ?? 0)},
			${Number(stock_alert ?? 0)},
			${Number(purchase_cost)},
			${Number(sale_cost)},
			${Number(reorder_level)}
		)
	`;
};

const deleteProduct = async (id) => {
	await prisma.$executeRaw`CALL delete_product(${Number(id)})`;
};

const getAllProducts = async () => {
	return prisma.$queryRaw`
		SELECT
			p.id,
			p.category_id,
			c.category_name,
			p.product_code,
			p.product_name,
			p.description,
			p.image,
			p.has_expire_date,
			p.expire_date,
			p.opening_quantity,
			p.minimum_sale_quantity,
			p.stock_alert,
			p.purchase_cost,
			p.sale_cost,
			p.reorder_level,
			p.created_at
		FROM products p
		JOIN categories c ON c.id = p.category_id
		ORDER BY p.id DESC
	`;
};

const getProductById = async (id) => {
	const products = await prisma.$queryRaw`
		SELECT
			p.id,
			p.category_id,
			c.category_name,
			p.product_code,
			p.product_name,
			p.description,
			p.image,
			p.has_expire_date,
			p.expire_date,
			p.opening_quantity,
			p.minimum_sale_quantity,
			p.stock_alert,
			p.purchase_cost,
			p.sale_cost,
			p.reorder_level,
			p.created_at
		FROM products p
		JOIN categories c ON c.id = p.category_id
		WHERE p.id = ${Number(id)}
		LIMIT 1
	`;

	return products[0] || null;
};

const searchProducts = async (query) => {
	const like = `%${String(query || '').trim()}%`;

	return prisma.$queryRaw`
		SELECT
			p.id AS product_id,
			p.product_name,
			COALESCE(NULLIF(p.product_barcode, ''), p.product_code) AS barcode,
			COALESCE(p.cost_price, p.purchase_cost) AS cost_price,
			COALESCE(p.selling_price, p.sale_cost) AS selling_price,
			COALESCE(p.current_stock, p.opening_quantity, 0) AS current_stock
		FROM products p
		WHERE
			p.product_name ILIKE ${like}
			OR p.product_code ILIKE ${like}
			OR COALESCE(p.product_barcode, '') ILIKE ${like}
		ORDER BY p.product_name ASC
		LIMIT 20
	`;
};

const getNextGeneratedProductCode = async () => {
	try {
		const result = await prisma.$queryRaw`
			SELECT LPAD(nextval('product_barcode_seq')::TEXT, 12, '0') AS code
		`;

		if (Array.isArray(result) && result[0]?.code) {
			return String(result[0].code);
		}
	} catch (_) {
		// Fall back when sequence is not present in environments that haven't migrated yet.
	}

	let code;
	let exists = true;

	while (exists) {
		const ts = Date.now().toString();
		const rand = Math.floor(100 + Math.random() * 900).toString();
		code = `${ts}${rand}`.slice(-12);

		const check = await prisma.$queryRaw`
			SELECT 1 AS exists FROM products WHERE product_code = ${code} LIMIT 1
		`;
		exists = Array.isArray(check) && check.length > 0;
	}

	return code;
};

module.exports = {
	createProduct,
	updateProduct,
	deleteProduct,
	getAllProducts,
	getProductById,
	searchProducts,
	getNextGeneratedProductCode,
};



