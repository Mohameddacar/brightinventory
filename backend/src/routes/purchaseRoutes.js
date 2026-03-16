const express = require('express');
const purchaseController = require('../controllers/PurchaseController');

const router = express.Router();

router.post('/purchases', purchaseController.createPurchase);
router.get('/warehouses', purchaseController.getWarehouses);
router.get('/purchases', purchaseController.getPurchases);
router.get('/purchases/:id/items', purchaseController.getPurchaseItems);
router.get('/purchases/:id', purchaseController.getPurchase);
router.put('/purchases/:id', purchaseController.updatePurchase);
router.delete('/purchases/:id', purchaseController.deletePurchase);

module.exports = router;
