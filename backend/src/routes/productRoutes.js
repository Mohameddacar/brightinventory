const express = require('express');
const productController = require('../controllers/ProductController');
const {
	validateCreateProduct,
	validateUpdateProduct,
	validateProductId,
} = require('../middlewares/productValidation');
const { handleProductImageUpload } = require('../middlewares/productImageUpload');

const router = express.Router();

router.post('/products', validateCreateProduct, productController.createProduct);
router.get('/products/barcode/new', productController.generateProductCode);
router.get('/products/generate-code', productController.generateProductCode);
router.get('/products/search', productController.searchProducts);
router.post('/products/upload-image', handleProductImageUpload, productController.uploadImage);
router.get('/products', productController.getProducts);
router.get('/products/:id', validateProductId, productController.getProduct);
router.put('/products/:id', validateUpdateProduct, productController.updateProduct);
router.delete('/products/:id', validateProductId, productController.deleteProduct);

module.exports = router;
