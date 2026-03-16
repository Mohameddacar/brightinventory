const saleItemService = require('../services/SaleItemServices');

const createSaleItem = async (req, res) => {
	try {
		await saleItemService.createSaleItem(req.body);
		return res.status(201).json({ message: 'SaleItem created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create saleitem', error: error.message });
	}
};

const updateSaleItem = async (req, res) => {
	try {
		const { id } = req.params;
		await saleItemService.updateSaleItem(id, req.body);
		return res.status(200).json({ message: 'SaleItem updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update saleitem', error: error.message });
	}
};

const deleteSaleItem = async (req, res) => {
	try {
		const { id } = req.params;
		await saleItemService.deleteSaleItem(id);
		return res.status(200).json({ message: 'SaleItem deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete saleitem', error: error.message });
	}
};

const getSaleItems = async (req, res) => {
	try {
		const rows = await saleItemService.getAllSaleItems();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch saleitem records', error: error.message });
	}
};

const getSaleItem = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await saleItemService.getSaleItemById(id);

		if (!row) {
			return res.status(404).json({ message: 'SaleItem not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch saleitem', error: error.message });
	}
};

module.exports = {
	createSaleItem,
	updateSaleItem,
	deleteSaleItem,
	getSaleItems,
	getSaleItem,
};
