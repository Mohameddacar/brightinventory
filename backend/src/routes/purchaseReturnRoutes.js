const express = require('express');
const purchaseReturnController = require('../controllers/PurchaseReturnController');

const router = express.Router();

router.post('/purchase-returns', purchaseReturnController.createPurchaseReturn);
router.get('/purchase-returns', purchaseReturnController.getPurchaseReturns);
router.get('/purchase-returns/:id', purchaseReturnController.getPurchaseReturn);
router.put('/purchase-returns/:id', purchaseReturnController.updatePurchaseReturn);
router.delete('/purchase-returns/:id', purchaseReturnController.deletePurchaseReturn);

module.exports = router;
