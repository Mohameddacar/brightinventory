const express = require('express');
const expenseTypeController = require('../controllers/ExpenseTypeController');

const router = express.Router();

router.post('/expense-types', expenseTypeController.createExpenseType);
router.get('/expense-types', expenseTypeController.getExpenseTypes);
router.get('/expense-types/:id', expenseTypeController.getExpenseType);
router.put('/expense-types/:id', expenseTypeController.updateExpenseType);
router.delete('/expense-types/:id', expenseTypeController.deleteExpenseType);

module.exports = router;
