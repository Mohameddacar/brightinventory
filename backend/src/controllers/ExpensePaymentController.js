const expensePaymentService = require('../services/ExpensePaymentServices');

const createExpensePayment = async (req, res) => {
	try {
		await expensePaymentService.createExpensePayment(req.body);
		return res.status(201).json({ message: 'ExpensePayment created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create expensepayment', error: error.message });
	}
};

const updateExpensePayment = async (req, res) => {
	try {
		const { id } = req.params;
		await expensePaymentService.updateExpensePayment(id, req.body);
		return res.status(200).json({ message: 'ExpensePayment updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update expensepayment', error: error.message });
	}
};

const deleteExpensePayment = async (req, res) => {
	try {
		const { id } = req.params;
		await expensePaymentService.deleteExpensePayment(id);
		return res.status(200).json({ message: 'ExpensePayment deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete expensepayment', error: error.message });
	}
};

const getExpensePayments = async (req, res) => {
	try {
		const rows = await expensePaymentService.getAllExpensePayments();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch expensepayment records', error: error.message });
	}
};

const getExpensePayment = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await expensePaymentService.getExpensePaymentById(id);

		if (!row) {
			return res.status(404).json({ message: 'ExpensePayment not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch expensepayment', error: error.message });
	}
};

module.exports = {
	createExpensePayment,
	updateExpensePayment,
	deleteExpensePayment,
	getExpensePayments,
	getExpensePayment,
};
