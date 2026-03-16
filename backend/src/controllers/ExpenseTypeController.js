const expenseTypeService = require('../services/ExpenseTypeServices');

const createExpenseType = async (req, res) => {
	try {
		await expenseTypeService.createExpenseType(req.body);
		return res.status(201).json({ message: 'ExpenseType created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create expensetype', error: error.message });
	}
};

const updateExpenseType = async (req, res) => {
	try {
		const { id } = req.params;
		await expenseTypeService.updateExpenseType(id, req.body);
		return res.status(200).json({ message: 'ExpenseType updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update expensetype', error: error.message });
	}
};

const deleteExpenseType = async (req, res) => {
	try {
		const { id } = req.params;
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
