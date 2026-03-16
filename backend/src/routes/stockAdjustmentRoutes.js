const express = require('express');
const stockAdjustmentController = require('../controllers/StockAdjustmentController');

const router = express.Router();

router.post('/stock-adjustments', stockAdjustmentController.createStockAdjustment);
router.get('/stock-adjustments', stockAdjustmentController.getStockAdjustments);
router.get('/stock-adjustments/:id', stockAdjustmentController.getStockAdjustment);
router.put('/stock-adjustments/:id', stockAdjustmentController.updateStockAdjustment);
router.delete('/stock-adjustments/:id', stockAdjustmentController.deleteStockAdjustment);

module.exports = router;
