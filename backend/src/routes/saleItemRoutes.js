const express = require('express');
const saleItemController = require('../controllers/SaleItemController');

const router = express.Router();

router.post('/sale-items', saleItemController.createSaleItem);
router.get('/sale-items', saleItemController.getSaleItems);
router.get('/sale-items/:id', saleItemController.getSaleItem);
router.put('/sale-items/:id', saleItemController.updateSaleItem);
router.delete('/sale-items/:id', saleItemController.deleteSaleItem);

module.exports = router;
