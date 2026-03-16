const express = require('express');
const transactionClosingController = require('../controllers/TransactionClosingController');

const router = express.Router();

router.post('/transaction-closings', transactionClosingController.createTransactionClosing);
router.get('/transaction-closings', transactionClosingController.getTransactionClosings);
router.get('/transaction-closings/:id', transactionClosingController.getTransactionClosing);
router.put('/transaction-closings/:id', transactionClosingController.updateTransactionClosing);
router.delete('/transaction-closings/:id', transactionClosingController.deleteTransactionClosing);

module.exports = router;
