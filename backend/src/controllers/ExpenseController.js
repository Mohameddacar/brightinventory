const expenseService = require('../services/ExpenseServices');

const createExpense = async (req, res) => {
  try {
    await expenseService.createExpense(req.body);
    return res.status(201).json({ message: 'Expense created successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create expense', error: error.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await expenseService.updateExpense(id, req.body);
    return res.status(200).json({ message: 'Expense updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update expense', error: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
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
