const express = require('express');
const paymentMethodController = require('../controllers/PaymentMethodController');

const router = express.Router();

router.post('/payment-methods', paymentMethodController.createPaymentMethod);
router.get('/payment-methods', paymentMethodController.getPaymentMethods);
router.get('/payment-methods/:id', paymentMethodController.getPaymentMethod);
router.put('/payment-methods/:id', paymentMethodController.updatePaymentMethod);
router.delete('/payment-methods/:id', paymentMethodController.deletePaymentMethod);

module.exports = router;
