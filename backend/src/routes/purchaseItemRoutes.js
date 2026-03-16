const express = require('express');
const purchaseItemController = require('../controllers/PurchaseItemController');

const router = express.Router();

router.post('/purchase-items', purchaseItemController.createPurchaseItem);
router.get('/purchase-items', purchaseItemController.getPurchaseItems);
router.get('/purchase-items/:id', purchaseItemController.getPurchaseItem);
router.put('/purchase-items/:id', purchaseItemController.updatePurchaseItem);
router.delete('/purchase-items/:id', purchaseItemController.deletePurchaseItem);

module.exports = router;
