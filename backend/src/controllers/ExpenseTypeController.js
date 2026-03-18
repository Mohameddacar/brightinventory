const expenseTypeService = require('../services/ExpenseTypeServices');

const TYPE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9\s&'().-]{1,118}$/;

const validateExpenseTypePayload = (payload) => {
	const errors = [];

	if (!payload || typeof payload !== 'object') {
		return ['Request payload is invalid'];
	}

	const typeName = String(payload.type_name || '').trim();
	if (!typeName) {
		errors.push('type_name is required');
	} else if (!TYPE_NAME_PATTERN.test(typeName)) {
		errors.push('type_name is invalid');
	}

	if (!payload.created_at || Number.isNaN(new Date(payload.created_at).getTime())) {
		errors.push('created_at is required and must be a valid date');
	}

	return errors;
};

const createExpenseType = async (req, res) => {
	try {
		const validationErrors = validateExpenseTypePayload(req.body);
		if (validationErrors.length > 0) {
			return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
		}

		await expenseTypeService.createExpenseType(req.body);
		return res.status(201).json({ message: 'ExpenseType created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create expensetype', error: error.message });
	}
};

const updateExpenseType = async (req, res) => {
	try {
		const validationErrors = validateExpenseTypePayload(req.body);
		if (validationErrors.length > 0) {
			return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
		}

		const { id } = req.params;
		const existing = await expenseTypeService.getExpenseTypeById(id);
		if (!existing) {
			return res.status(404).json({ message: 'ExpenseType not found' });
		}

		await expenseTypeService.updateExpenseType(id, req.body);
		return res.status(200).json({ message: 'ExpenseType updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update expensetype', error: error.message });
	}
};

const deleteExpenseType = async (req, res) => {
	try {
		const { id } = req.params;
		const existing = await expenseTypeService.getExpenseTypeById(id);
		if (!existing) {
			return res.status(404).json({ message: 'ExpenseType not found' });
		}

		await expenseTypeService.deleteExpenseType(id);
		return res.status(200).json({ message: 'ExpenseType deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete expensetype', error: error.message });
	}
};

const getExpenseTypes = async (req, res) => {
	try {
		const rows = await expenseTypeService.getAllExpenseTypes();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch expensetype records', error: error.message });
	}
};

const getExpenseType = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await expenseTypeService.getExpenseTypeById(id);

		if (!row) {
			return res.status(404).json({ message: 'ExpenseType not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch expensetype', error: error.message });
	}
};

module.exports = {
	createExpenseType,
	updateExpenseType,
	deleteExpenseType,
	getExpenseTypes,
	getExpenseType,
};
