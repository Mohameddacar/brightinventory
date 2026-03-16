const {
	buildValidator,
	isPlainObject,
	normalizeOptionalText,
	parsePositiveInt,
	parseNonNegativeNumber,
	parseDate,
} = require('./validationHelpers');

const SUPPLIER_ALLOWED_FIELDS = new Set([
	'full_name',
	'address',
	'mobile_no',
	'email',
	'opening_balance',
	'balance_type',
	'registered_date',
]);

const VALID_BALANCE_TYPES = new Set(['credit', 'debit', 'none']);
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]*$/;
const MOBILE_PATTERN = /^[+0-9][0-9\-\s]{6,29}$/;

const validateSupplierPayload = (body, errors) => {
	if (!isPlainObject(body)) {
		errors.push('Body must be a JSON object');
		return null;
	}

	const extraFields = Object.keys(body).filter((key) => !SUPPLIER_ALLOWED_FIELDS.has(key));
	if (extraFields.length > 0) {
		errors.push(`Unexpected field(s): ${extraFields.join(', ')}`);
	}

	const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
	if (fullName.length < 2 || fullName.length > 120) {
		errors.push('full_name is required and must be between 2 and 120 characters');
	} else if (!NAME_PATTERN.test(fullName)) {
		errors.push('full_name must contain only letters, spaces, apostrophes, dots, or hyphens');
	}

	const address = normalizeOptionalText(body.address);
	if (body.address !== undefined && body.address !== null && typeof body.address !== 'string') {
		errors.push('address must be a string when provided');
	}
	if (address && address.length > 255) {
		errors.push('address must not exceed 255 characters');
	}

	const mobileNo = normalizeOptionalText(body.mobile_no);
	if (!mobileNo) {
		errors.push('mobile_no is required');
	} else if (mobileNo.length < 7 || mobileNo.length > 30) {
		errors.push('mobile_no must be between 7 and 30 characters');
	} else if (!MOBILE_PATTERN.test(mobileNo)) {
		errors.push('mobile_no format is invalid');
	}

	const email = normalizeOptionalText(body.email);
	if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		errors.push('email must be a valid email address');
	}

	const openingBalance = parseNonNegativeNumber(body.opening_balance ?? 0);
	if (openingBalance === null) {
		errors.push('opening_balance must be a non-negative number');
	}

	const balanceType = typeof body.balance_type === 'string' ? body.balance_type.toLowerCase().trim() : '';
	if (!VALID_BALANCE_TYPES.has(balanceType)) {
		errors.push('balance_type must be one of: credit, debit, none');
	}

	const registeredDate = parseDate(body.registered_date);
	if (!registeredDate) {
		errors.push('registered_date is required and must be a valid date');
	}

	if (errors.length > 0) {
		return null;
	}

	return {
		full_name: fullName,
		address,
		mobile_no: mobileNo,
		email,
		opening_balance: openingBalance,
		balance_type: balanceType,
		registered_date: registeredDate.toISOString(),
	};
};

const validateSupplierId = (req, errors) => {
	const id = parsePositiveInt(req.params.id);
	if (!id) {
		errors.push('id must be a positive integer');
		return null;
	}

	return id;
};

const validateCreateSupplier = buildValidator((req) => {
	const errors = [];
	const body = validateSupplierPayload(req.body, errors);

	return {
		errors,
		data: {
			body,
		},
	};
});

const validateUpdateSupplier = buildValidator((req) => {
	const errors = [];
	const id = validateSupplierId(req, errors);
	const body = validateSupplierPayload(req.body, errors);

	return {
		errors,
		data: {
			params: { id },
			body,
		},
	};
});

const validateDeleteSupplier = buildValidator((req) => {
	const errors = [];
	const id = validateSupplierId(req, errors);

	return {
		errors,
		data: {
			params: { id },
		},
	};
});

const validateGetSupplier = validateDeleteSupplier;

module.exports = {
	validateCreateSupplier,
	validateUpdateSupplier,
	validateDeleteSupplier,
	validateGetSupplier,
};
