const purchaseReturnItemService = require('../services/PurchaseReturnItemServices');

const createPurchaseReturnItem = async (req, res) => {
	try {
		await purchaseReturnItemService.createPurchaseReturnItem(req.body);
		return res.status(201).json({ message: 'PurchaseReturnItem created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create purchasereturnitem', error: error.message });
	}
};

const updatePurchaseReturnItem = async (req, res) => {
	try {
		const { id } = req.params;
		await purchaseReturnItemService.updatePurchaseReturnItem(id, req.body);
		return res.status(200).json({ message: 'PurchaseReturnItem updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update purchasereturnitem', error: error.message });
	}
};

const deletePurchaseReturnItem = async (req, res) => {
	try {
		const { id } = req.params;
		await purchaseReturnItemService.deletePurchaseReturnItem(id);
		return res.status(200).json({ message: 'PurchaseReturnItem deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete purchasereturnitem', error: error.message });
	}
};

const getPurchaseReturnItems = async (req, res) => {
	try {
		const rows = await purchaseReturnItemService.getAllPurchaseReturnItems();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch purchasereturnitem records', error: error.message });
	}
};

const getPurchaseReturnItem = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await purchaseReturnItemService.getPurchaseReturnItemById(id);

		if (!row) {
			return res.status(404).json({ message: 'PurchaseReturnItem not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch purchasereturnitem', error: error.message });
	}
};

module.exports = {
	createPurchaseReturnItem,
	updatePurchaseReturnItem,
	deletePurchaseReturnItem,
	getPurchaseReturnItems,
	getPurchaseReturnItem,
};
