const express = require('express');
const inventoryController = require('../controllers/InventoryController');

const router = express.Router();

router.get('/inventory', inventoryController.getInventoryOverview);
router.get('/inventory/product/:id', inventoryController.getInventoryByProduct);
router.get('/stock-movements', inventoryController.getStockMovements);

module.exports = router;
