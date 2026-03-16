const express = require('express');
const salesReturnController = require('../controllers/SalesReturnController');

const router = express.Router();

router.post('/sales-returns', salesReturnController.createSalesReturn);
router.get('/sales-returns', salesReturnController.getSalesReturns);
router.get('/sales-returns/:id', salesReturnController.getSalesReturn);
router.put('/sales-returns/:id', salesReturnController.updateSalesReturn);
router.delete('/sales-returns/:id', salesReturnController.deleteSalesReturn);

module.exports = router;
