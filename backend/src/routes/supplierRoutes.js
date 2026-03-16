const express = require('express');
const supplierController = require('../controllers/SupplierController');
const {
	validateCreateSupplier,
	validateUpdateSupplier,
	validateDeleteSupplier,
	validateGetSupplier,
} = require('../middlewares/supplierValidation');

const router = express.Router();

router.post('/suppliers', validateCreateSupplier, supplierController.createSupplier);
router.get('/suppliers', supplierController.getSuppliers);
router.get('/suppliers/:id', validateGetSupplier, supplierController.getSupplier);
router.put('/suppliers/:id', validateUpdateSupplier, supplierController.updateSupplier);
router.delete('/suppliers/:id', validateDeleteSupplier, supplierController.deleteSupplier);

module.exports = router;
