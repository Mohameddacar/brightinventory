const expenseService = require('../services/ExpenseServices');

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s&'().,-]{1,149}$/;

const validateExpensePayload = (payload) => {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return ['Request payload is invalid'];
  }

  if (!payload.expense_type_id || Number(payload.expense_type_id) <= 0) {
    errors.push('expense_type_id is required');
  }

  if (!payload.invoice_date || Number.isNaN(new Date(payload.invoice_date).getTime())) {
    errors.push('invoice_date is required and must be a valid date');
  }

  const receiverName = String(payload.receiver_name || '').trim();
  if (!receiverName) {
    errors.push('receiver_name is required');
  } else if (!NAME_PATTERN.test(receiverName)) {
    errors.push('receiver_name is invalid');
  }

  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.push('amount must be greater than 0');
  }

  return errors;
};

const createExpense = async (req, res) => {
  try {
    const validationErrors = validateExpensePayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    await expenseService.createExpense(req.body);
    return res.status(201).json({ message: 'Expense created successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create expense', error: error.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const validationErrors = validateExpensePayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    const { id } = req.params;
    const existing = await expenseService.getExpenseById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    await expenseService.updateExpense(id, req.body);
    return res.status(200).json({ message: 'Expense updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update expense', error: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await expenseService.getExpenseById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    await expenseService.deleteExpense(id);
    return res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete expense', error: error.message });
  }
};

const getExpenses = async (req, res) => {
  try {
    const expenses = await expenseService.getAllExpenses();
    return res.status(200).json(expenses);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch expenses', error: error.message });
  }
};

const getExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await expenseService.getExpenseById(id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    return res.status(200).json(expense);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch expense', error: error.message });
  }
};

module.exports = {
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenses,
  getExpense,
};
