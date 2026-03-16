const express = require('express');
const cashDepositController = require('../controllers/CashDepositController');

const router = express.Router();

router.post('/cash-deposits', cashDepositController.createCashDeposit);
router.get('/cash-deposits', cashDepositController.getCashDeposits);
router.get('/cash-deposits/:id', cashDepositController.getCashDeposit);
router.put('/cash-deposits/:id', cashDepositController.updateCashDeposit);
router.delete('/cash-deposits/:id', cashDepositController.deleteCashDeposit);

module.exports = router;
