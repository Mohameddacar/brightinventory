const express = require('express');
const categoryController = require('../controllers/CategoryController');
const {
	validateCreateCategory,
	validateUpdateCategory,
	validateDeleteCategory,
} = require('../middlewares/categoryValidation');

const router = express.Router();

router.post('/categories', validateCreateCategory, categoryController.createCategory);
router.get('/categories', categoryController.getCategories);
router.put('/categories/:id', validateUpdateCategory, categoryController.updateCategory);
router.delete('/categories/:id', validateDeleteCategory, categoryController.deleteCategory);

module.exports = router;
