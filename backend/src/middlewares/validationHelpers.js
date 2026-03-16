const isPlainObject = (value) => {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const normalizeOptionalText = (value) => {
	if (value === undefined || value === null) {
		return null;
	}

	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length ? trimmed : null;
};

const parsePositiveInt = (value) => {
	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		return null;
	}

	return parsed;
};

const parseNonNegativeNumber = (value) => {
	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed < 0) {
		return null;
	}

	return parsed;
};

const parseBoolean = (value) => {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'string') {
		if (value.toLowerCase() === 'true') {
			return true;
		}

		if (value.toLowerCase() === 'false') {
			return false;
		}

		if (value.toLowerCase() === 'yes') {
			return true;
		}

		if (value.toLowerCase() === 'no') {
			return false;
		}
	}

	if (value === 1 || value === '1') {
		return true;
	}

	if (value === 0 || value === '0') {
		return false;
	}

	return null;
};

const parseDate = (value) => {
	if (value === undefined || value === null || value === '') {
		return null;
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return date;
};

const buildValidator = (validator) => {
	return (req, res, next) => {
		try {
			const result = validator(req);

			if (result.errors.length > 0) {
				return res.status(400).json({
					message: 'Validation failed',
					errors: result.errors,
				});
			}

			req.validated = result.data;
			return next();
		} catch (error) {
			return res.status(500).json({
				message: 'Validation processing failed',
				error: error.message,
			});
		}
	};
};

module.exports = {
	isPlainObject,
	normalizeOptionalText,
	parsePositiveInt,
	parseNonNegativeNumber,
	parseBoolean,
	parseDate,
	buildValidator,
};
