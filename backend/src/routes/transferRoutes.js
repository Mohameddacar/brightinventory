const express = require('express');
const transferController = require('../controllers/TransferController');

const router = express.Router();

router.get('/transfers/warehouses', transferController.getWarehouses);
router.post('/transfers', transferController.createTransfer);
router.get('/transfers', transferController.getTransfers);
router.get('/transfers/:id', transferController.getTransfer);
router.delete('/transfers/:id', transferController.deleteTransfer);

module.exports = router;
