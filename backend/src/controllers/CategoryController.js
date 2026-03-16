const categoryService = require('../services/categoryServices');

const mapDatabaseError = (error) => {
	if (error?.code === 'P2010') {
		const details = String(error?.meta?.message || error.message || '').toLowerCase();

		if (details.includes('foreign key')) {
			return { status: 409, message: 'Category is referenced by other records and cannot be deleted' };
		}

		if (details.includes('not-null') || details.includes('invalid input syntax')) {
			return { status: 400, message: 'Invalid category payload' };
		}
	}

	return { status: 500, message: null };
};

const createCategory = async (req, res) => {
	try {
		const { name, description } = req.validated.body;
		await categoryService.createCategory(name, description);

		return res.status(201).json({ message: 'Category created successfully' });
	} catch (error) {
		const dbError = mapDatabaseError(error);
		return res.status(dbError.status).json({
			message: dbError.message || 'Failed to create category',
			error: dbError.status === 500 ? error.message : undefined,
		});
	}
};

const updateCategory = async (req, res) => {
	try {
		const { id } = req.validated.params;
		const { name, description } = req.validated.body;
		await categoryService.updateCategory(id, name, description);

		return res.status(200).json({ message: 'Category updated successfully' });
	} catch (error) {
		const dbError = mapDatabaseError(error);
		return res.status(dbError.status).json({
			message: dbError.message || 'Failed to update category',
			error: dbError.status === 500 ? error.message : undefined,
		});
	}
};

const deleteCategory = async (req, res) => {
	try {
		const { id } = req.validated.params;
		await categoryService.deleteCategory(id);

		return res.status(200).json({ message: 'Category deleted successfully' });
	} catch (error) {
		const dbError = mapDatabaseError(error);
		return res.status(dbError.status).json({
			message: dbError.message || 'Failed to delete category',
			error: dbError.status === 500 ? error.message : undefined,
		});
	}
};

const getCategories = async (req, res) => {
	try {
		const categories = await categoryService.getAllCategories();
		return res.status(200).json(categories);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
	}
};

module.exports = {
	createCategory,
	updateCategory,
	deleteCategory,
	getCategories,
};
