const express = require('express');
const supplierPaymentController = require('../controllers/SupplierPaymentController');

const router = express.Router();

router.post('/supplier-payments', supplierPaymentController.createSupplierPayment);
router.get('/supplier-payments', supplierPaymentController.getSupplierPayments);
router.get('/supplier-payments/:id', supplierPaymentController.getSupplierPayment);
router.put('/supplier-payments/:id', supplierPaymentController.updateSupplierPayment);
router.delete('/supplier-payments/:id', supplierPaymentController.deleteSupplierPayment);

module.exports = router;
