const purchaseItemService = require('../services/PurchaseItemServices');

const createPurchaseItem = async (req, res) => {
	try {
		await purchaseItemService.createPurchaseItem(req.body);
		return res.status(201).json({ message: 'PurchaseItem created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create purchaseitem', error: error.message });
	}
};

const updatePurchaseItem = async (req, res) => {
	try {
		const { id } = req.params;
		await purchaseItemService.updatePurchaseItem(id, req.body);
		return res.status(200).json({ message: 'PurchaseItem updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update purchaseitem', error: error.message });
	}
};

const deletePurchaseItem = async (req, res) => {
	try {
		const { id } = req.params;
		await purchaseItemService.deletePurchaseItem(id);
		return res.status(200).json({ message: 'PurchaseItem deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete purchaseitem', error: error.message });
	}
};

const getPurchaseItems = async (req, res) => {
	try {
		const rows = await purchaseItemService.getAllPurchaseItems();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch purchaseitem records', error: error.message });
	}
};

const getPurchaseItem = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await purchaseItemService.getPurchaseItemById(id);

		if (!row) {
			return res.status(404).json({ message: 'PurchaseItem not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch purchaseitem', error: error.message });
	}
};

module.exports = {
	createPurchaseItem,
	updatePurchaseItem,
	deletePurchaseItem,
	getPurchaseItems,
	getPurchaseItem,
};
