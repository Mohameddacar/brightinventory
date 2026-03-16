const express = require('express');
const salesReturnItemController = require('../controllers/SalesReturnItemController');

const router = express.Router();

router.post('/sales-return-items', salesReturnItemController.createSalesReturnItem);
router.get('/sales-return-items', salesReturnItemController.getSalesReturnItems);
router.get('/sales-return-items/:id', salesReturnItemController.getSalesReturnItem);
router.put('/sales-return-items/:id', salesReturnItemController.updateSalesReturnItem);
router.delete('/sales-return-items/:id', salesReturnItemController.deleteSalesReturnItem);

module.exports = router;
