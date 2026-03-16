const express = require('express');
const purchaseReturnItemController = require('../controllers/PurchaseReturnItemController');

const router = express.Router();

router.post('/purchase-return-items', purchaseReturnItemController.createPurchaseReturnItem);
router.get('/purchase-return-items', purchaseReturnItemController.getPurchaseReturnItems);
router.get('/purchase-return-items/:id', purchaseReturnItemController.getPurchaseReturnItem);
router.put('/purchase-return-items/:id', purchaseReturnItemController.updatePurchaseReturnItem);
router.delete('/purchase-return-items/:id', purchaseReturnItemController.deletePurchaseReturnItem);

module.exports = router;
