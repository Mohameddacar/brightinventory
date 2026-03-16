const {
	buildValidator,
	isPlainObject,
	normalizeOptionalText,
	parsePositiveInt,
} = require('./validationHelpers');

const CATEGORY_ALLOWED_FIELDS = new Set(['name', 'category_name', 'description']);
const CATEGORY_NAME_PATTERN = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/;
const CATEGORY_DESCRIPTION_PATTERN = /^[A-Za-z0-9]+(?:[A-Za-z0-9\s.,'()-]*[A-Za-z0-9.])?$/;
const INVALID_CATEGORY_TERMS = new Set([
	'test',
	'testing',
	'demo',
	'sample',
	'temp',
	'misc',
	'others',
	'other',
	'na',
	'n/a',
	'none',
	'null',
	'unknown',
	'asdf',
	'qwerty',
	'abc',
	'abcd',
	'xyz',
]);

const isLikelyPlaceholder = (value) => {
	const normalized = value.trim().toLowerCase();
	if (!normalized) {
		return true;
	}

	if (INVALID_CATEGORY_TERMS.has(normalized)) {
		return true;
	}

	if (/^(.)\1+$/i.test(normalized.replace(/\s+/g, ''))) {
		return true;
	}

	return false;
};

const validateCategoryPayload = (body, errors) => {
	if (!isPlainObject(body)) {
		errors.push('Body must be a JSON object');
		return null;
	}

	const extraFields = Object.keys(body).filter((key) => !CATEGORY_ALLOWED_FIELDS.has(key));
	if (extraFields.length > 0) {
		errors.push(`Unexpected field(s): ${extraFields.join(', ')}`);
	}

	const rawName = body.name ?? body.category_name;
	if (typeof rawName !== 'string' || rawName.trim().length < 3) {
		errors.push('name is required and must be at least 3 characters');
	}

	const name = typeof rawName === 'string' ? rawName.trim() : '';
	if (name.length > 100) {
		errors.push('name must not exceed 100 characters');
	}

	if (name && !CATEGORY_NAME_PATTERN.test(name)) {
		errors.push('name must contain only letters and spaces');
	}

	if (name && isLikelyPlaceholder(name)) {
		errors.push('name looks invalid; use an official category name');
	}

	const description = normalizeOptionalText(body.description);
	if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
		errors.push('description must be a string when provided');
	}

	if (description && description.length < 10) {
		errors.push('description must be at least 10 characters when provided');
	}

	if (description && description.length > 300) {
		errors.push('description must not exceed 300 characters');
	}

	if (description && !/[A-Za-z]/.test(description)) {
		errors.push('description must contain meaningful text');
	}

	if (description && !CATEGORY_DESCRIPTION_PATTERN.test(description)) {
		errors.push('description contains invalid characters');
	}

	if (description && isLikelyPlaceholder(description)) {
		errors.push('description looks invalid; provide a real category description');
	}

	if (errors.length > 0) {
		return null;
	}

	return {
		name,
		description,
	};
};

const validateCategoryIdParam = (req, errors) => {
	const id = parsePositiveInt(req.params.id);
	if (!id) {
		errors.push('id must be a positive integer');
		return null;
	}

	return id;
};

const validateCreateCategory = buildValidator((req) => {
	const errors = [];
	const payload = validateCategoryPayload(req.body, errors);

	return {
		errors,
		data: {
			body: payload,
		},
	};
});

const validateUpdateCategory = buildValidator((req) => {
	const errors = [];
	const id = validateCategoryIdParam(req, errors);
	const payload = validateCategoryPayload(req.body, errors);

	return {
		errors,
		data: {
			params: { id },
			body: payload,
		},
	};
});

const validateDeleteCategory = buildValidator((req) => {
	const errors = [];
	const id = validateCategoryIdParam(req, errors);

	return {
		errors,
		data: {
			params: { id },
		},
	};
});

module.exports = {
	validateCreateCategory,
	validateUpdateCategory,
	validateDeleteCategory,
};
