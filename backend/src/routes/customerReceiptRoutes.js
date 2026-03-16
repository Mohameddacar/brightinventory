const express = require('express');
const customerReceiptController = require('../controllers/CustomerReceiptController');

const router = express.Router();

router.post('/customer-receipts', customerReceiptController.createCustomerReceipt);
router.get('/customer-receipts', customerReceiptController.getCustomerReceipts);
router.get('/customer-receipts/:id', customerReceiptController.getCustomerReceipt);
router.put('/customer-receipts/:id', customerReceiptController.updateCustomerReceipt);
router.delete('/customer-receipts/:id', customerReceiptController.deleteCustomerReceipt);

module.exports = router;
