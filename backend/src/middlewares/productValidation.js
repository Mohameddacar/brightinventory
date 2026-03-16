const {
	buildValidator,
	isPlainObject,
	normalizeOptionalText,
	parsePositiveInt,
	parseNonNegativeNumber,
	parseBoolean,
	parseDate,
} = require('./validationHelpers');

const PRODUCT_ALLOWED_FIELDS = new Set([
	'category_id',
	'product_code',
	'product_name',
	'description',
	'image',
	'has_expire_date',
	'expire_date',
	'opening_quantity',
	'minimum_sale_quantity',
	'stock_alert',
	'purchase_cost',
	'sale_cost',
	'reorder_level',
]);

const CODE_PATTERN = /^[0-9]{8,20}$/;

const validateProductPayload = (body, errors) => {
	if (!isPlainObject(body)) {
		errors.push('Body must be a JSON object');
		return null;
	}

	const extraFields = Object.keys(body).filter((key) => !PRODUCT_ALLOWED_FIELDS.has(key));
	if (extraFields.length > 0) {
		errors.push(`Unexpected field(s): ${extraFields.join(', ')}`);
	}

	const categoryId = parsePositiveInt(body.category_id);
	if (!categoryId) {
		errors.push('category_id is required and must be a positive integer');
	}

	const productCode = typeof body.product_code === 'string' ? body.product_code.trim() : '';
	if (productCode && !CODE_PATTERN.test(productCode)) {
		errors.push('product_code must be numeric and between 8 and 20 digits');
	}

	const productName = typeof body.product_name === 'string' ? body.product_name.trim() : '';
	if (productName.length < 2 || productName.length > 150) {
		errors.push('product_name must be between 2 and 150 characters');
	}

	const description = normalizeOptionalText(body.description);
	if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
		errors.push('description must be a string when provided');
	}
	if (description && description.length > 1000) {
		errors.push('description must not exceed 1000 characters');
	}

	const image = normalizeOptionalText(body.image);
	if (body.image !== undefined && body.image !== null && typeof body.image !== 'string') {
		errors.push('image must be a string when provided');
	}
	if (image && image.length > 500) {
		errors.push('image must not exceed 500 characters');
	}

	const hasExpireDate = parseBoolean(body.has_expire_date ?? false);
	if (hasExpireDate === null) {
		errors.push('has_expire_date must be a boolean');
	}

	const expireDate = parseDate(body.expire_date);
	if (body.expire_date !== undefined && body.expire_date !== null && body.expire_date !== '' && !expireDate) {
		errors.push('expire_date must be a valid date');
	}
	if (hasExpireDate === true && !expireDate) {
		errors.push('expire_date is required when has_expire_date is true');
	}

	const openingQuantity = parseNonNegativeNumber(body.opening_quantity);
	if (openingQuantity === null || !Number.isInteger(openingQuantity)) {
		errors.push('opening_quantity is required and must be a non-negative integer');
	}

	const minimumSaleQuantity = parseNonNegativeNumber(body.minimum_sale_quantity ?? 0);
	if (minimumSaleQuantity === null || !Number.isInteger(minimumSaleQuantity)) {
		errors.push('minimum_sale_quantity must be a non-negative integer');
	}

	const stockAlert = parseNonNegativeNumber(body.stock_alert ?? 0);
	if (stockAlert === null || !Number.isInteger(stockAlert)) {
		errors.push('stock_alert must be a non-negative integer');
	}

	const purchaseCost = parseNonNegativeNumber(body.purchase_cost);
	if (purchaseCost === null) {
		errors.push('purchase_cost is required and must be a non-negative number');
	}

	const saleCost = parseNonNegativeNumber(body.sale_cost);
	if (saleCost === null) {
		errors.push('sale_cost is required and must be a non-negative number');
	}

	const reorderLevel = parseNonNegativeNumber(body.reorder_level);
	if (reorderLevel === null || !Number.isInteger(reorderLevel)) {
		errors.push('reorder_level is required and must be a non-negative integer');
	}

	if (errors.length > 0) {
		return null;
	}

	return {
		category_id: categoryId,
		product_code: productCode || null,
		product_name: productName,
		description,
		image,
		has_expire_date: hasExpireDate,
		expire_date: hasExpireDate ? expireDate.toISOString() : null,
		opening_quantity: openingQuantity,
		minimum_sale_quantity: minimumSaleQuantity,
		stock_alert: stockAlert,
		purchase_cost: purchaseCost,
		sale_cost: saleCost,
		reorder_level: stockAlert,
	};
};

const validateProductIdParam = (req, errors) => {
	const id = parsePositiveInt(req.params.id);
	if (!id) {
		errors.push('id must be a positive integer');
		return null;
	}

	return id;
};

const validateCreateProduct = buildValidator((req) => {
	const errors = [];
	const payload = validateProductPayload(req.body, errors);

	return {
		errors,
		data: {
			body: payload,
		},
	};
});

const validateUpdateProduct = buildValidator((req) => {
	const errors = [];
	const id = validateProductIdParam(req, errors);
	const payload = validateProductPayload(req.body, errors);

	return {
		errors,
		data: {
			params: { id },
			body: payload,
		},
	};
});

const validateProductId = buildValidator((req) => {
	const errors = [];
	const id = validateProductIdParam(req, errors);

	return {
		errors,
		data: {
			params: { id },
		},
	};
});

module.exports = {
	validateCreateProduct,
	validateUpdateProduct,
	validateProductId,
};
