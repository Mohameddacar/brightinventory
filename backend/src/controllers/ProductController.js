const productService = require('../services/ProductServices');

const generateFallbackProductCode = () => {
	const ts = Date.now().toString();
	const rand = Math.floor(100 + Math.random() * 900).toString();
	return `${ts}${rand}`.slice(-12);
};

const mapDatabaseError = (error) => {
	if (error?.code === 'P2010') {
		const details = String(error?.meta?.message || error.message || '').toLowerCase();

		if (details.includes('foreign key')) {
			return { status: 400, message: 'category_id does not reference an existing category' };
		}

		if (details.includes('not-null') || details.includes('invalid input syntax') || details.includes('numeric')) {
			return { status: 400, message: 'Invalid product payload' };
		}
	}

	return { status: 500, message: null };
};

const createProduct = async (req, res) => {
	try {
		await productService.createProduct(req.validated.body);
		return res.status(201).json({ message: 'Product created successfully' });
	} catch (error) {
		const dbError = mapDatabaseError(error);
		return res.status(dbError.status).json({
			message: dbError.message || 'Failed to create product',
			error: dbError.status === 500 ? error.message : undefined,
		});
	}
};

const updateProduct = async (req, res) => {
	try {
		const { id } = req.validated.params;
		await productService.updateProduct(id, req.validated.body);
		return res.status(200).json({ message: 'Product updated successfully' });
	} catch (error) {
		const dbError = mapDatabaseError(error);
		return res.status(dbError.status).json({
			message: dbError.message || 'Failed to update product',
			error: dbError.status === 500 ? error.message : undefined,
		});
	}
};

const deleteProduct = async (req, res) => {
	try {
		const { id } = req.validated.params;
		await productService.deleteProduct(id);
		return res.status(200).json({ message: 'Product deleted successfully' });
	} catch (error) {
		const dbError = mapDatabaseError(error);
		return res.status(dbError.status).json({
			message: dbError.message || 'Failed to delete product',
			error: dbError.status === 500 ? error.message : undefined,
		});
	}
};

const getProducts = async (req, res) => {
	try {
		const products = await productService.getAllProducts();
		return res.status(200).json(products);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch products', error: error.message });
	}
};

const getProduct = async (req, res) => {
	try {
		const { id } = req.validated.params;
		const product = await productService.getProductById(id);

		if (!product) {
			return res.status(404).json({ message: 'Product not found' });
		}

		return res.status(200).json(product);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch product', error: error.message });
	}
};

const searchProducts = async (req, res) => {
	try {
		const query = String(req.query.query || '').trim();

		if (!query) {
			return res.status(200).json([]);
		}

		const products = await productService.searchProducts(query);
		return res.status(200).json(products);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to search products', error: error.message });
	}
};

const uploadImage = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ message: 'Image file is required' });
		}

		const imagePath = `/uploads/products/${req.file.filename}`;
		const imageUrl = `${req.protocol}://${req.get('host')}${imagePath}`;

		return res.status(201).json({
			message: 'Image uploaded successfully',
			image: imagePath,
			image_url: imageUrl,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Failed to upload image', error: error.message });
	}
};

const generateProductCode = async (req, res) => {
	try {
		const code = await productService.getNextGeneratedProductCode();
		return res.status(200).json({ code });
	} catch (error) {
		const fallbackCode = generateFallbackProductCode();
		return res.status(200).json({
			code: fallbackCode,
			fallback: true,
			warning: 'Generated locally because database sequence is unavailable',
		});
	}
};

module.exports = {
	createProduct,
	updateProduct,
	deleteProduct,
	getProducts,
	getProduct,
	searchProducts,
	uploadImage,
	generateProductCode,
};
