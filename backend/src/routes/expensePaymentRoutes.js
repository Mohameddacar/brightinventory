const express = require('express');
const expensePaymentController = require('../controllers/ExpensePaymentController');

const router = express.Router();

router.post('/expense-payments', expensePaymentController.createExpensePayment);
router.get('/expense-payments', expensePaymentController.getExpensePayments);
router.get('/expense-payments/:id', expensePaymentController.getExpensePayment);
router.put('/expense-payments/:id', expensePaymentController.updateExpensePayment);
router.delete('/expense-payments/:id', expensePaymentController.deleteExpensePayment);

module.exports = router;
