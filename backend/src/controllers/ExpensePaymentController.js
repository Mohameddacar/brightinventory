const expensePaymentService = require('../services/ExpensePaymentServices');

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Card', 'Mobile Banking', 'Cheque'];

const validateExpensePaymentPayload = (payload) => {
	const errors = [];

	if (!payload || typeof payload !== 'object') {
		return ['Request payload is invalid'];
	}

	if (!payload.expense_bill_id || Number(payload.expense_bill_id) <= 0) {
		errors.push('expense_bill_id is required');
	}

	const paymentMode = String(payload.payment_mode || '').trim();
	if (!paymentMode) {
		errors.push('payment_mode is required');
	} else if (!PAYMENT_MODES.includes(paymentMode)) {
		errors.push(`payment_mode must be one of: ${PAYMENT_MODES.join(', ')}`);
	}

	if (!payload.payment_date || Number.isNaN(new Date(payload.payment_date).getTime())) {
		errors.push('payment_date is required and must be a valid date');
	}

	const cash = Number(payload.cash);
	if (!Number.isFinite(cash) || cash < 0) {
		errors.push('cash must be a non-negative number');
	}

	const amount = Number(payload.amount);
	if (!Number.isFinite(amount) || amount <= 0) {
		errors.push('amount must be greater than 0');
	}

	return errors;
};

const createExpensePayment = async (req, res) => {
	try {
		const validationErrors = validateExpensePaymentPayload(req.body);
		if (validationErrors.length > 0) {
			return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
		}

		await expensePaymentService.createExpensePayment(req.body);
		return res.status(201).json({ message: 'ExpensePayment created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create expensepayment', error: error.message });
	}
};

const updateExpensePayment = async (req, res) => {
	try {
		const validationErrors = validateExpensePaymentPayload(req.body);
		if (validationErrors.length > 0) {
			return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
		}

		const { id } = req.params;
		const existing = await expensePaymentService.getExpensePaymentById(id);
		if (!existing) {
			return res.status(404).json({ message: 'ExpensePayment not found' });
		}

		await expensePaymentService.updateExpensePayment(id, req.body);
		return res.status(200).json({ message: 'ExpensePayment updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update expensepayment', error: error.message });
	}
};

const deleteExpensePayment = async (req, res) => {
	try {
		const { id } = req.params;
		const existing = await expensePaymentService.getExpensePaymentById(id);
		if (!existing) {
			return res.status(404).json({ message: 'ExpensePayment not found' });
		}

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
