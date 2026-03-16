const express = require('express');
const expenseController = require('../controllers/ExpenseController');

const router = express.Router();

router.post('/expenses', expenseController.createExpense);
router.get('/expenses', expenseController.getExpenses);
router.get('/expenses/:id', expenseController.getExpense);
router.put('/expenses/:id', expenseController.updateExpense);
router.delete('/expenses/:id', expenseController.deleteExpense);

module.exports = router;
