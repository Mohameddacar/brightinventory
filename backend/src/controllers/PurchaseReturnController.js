const purchaseReturnService = require('../services/PurchaseReturnServices');

const createPurchaseReturn = async (req, res) => {
	try {
		await purchaseReturnService.createPurchaseReturn(req.body);
		return res.status(201).json({ message: 'PurchaseReturn created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create purchasereturn', error: error.message });
	}
};

const updatePurchaseReturn = async (req, res) => {
	try {
		const { id } = req.params;
		await purchaseReturnService.updatePurchaseReturn(id, req.body);
		return res.status(200).json({ message: 'PurchaseReturn updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update purchasereturn', error: error.message });
	}
};

const deletePurchaseReturn = async (req, res) => {
	try {
		const { id } = req.params;
		await purchaseReturnService.deletePurchaseReturn(id);
		return res.status(200).json({ message: 'PurchaseReturn deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete purchasereturn', error: error.message });
	}
};

const getPurchaseReturns = async (req, res) => {
	try {
		const rows = await purchaseReturnService.getAllPurchaseReturns();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch purchasereturn records', error: error.message });
	}
};

const getPurchaseReturn = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await purchaseReturnService.getPurchaseReturnById(id);

		if (!row) {
			return res.status(404).json({ message: 'PurchaseReturn not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch purchasereturn', error: error.message });
	}
};

module.exports = {
	createPurchaseReturn,
	updatePurchaseReturn,
	deletePurchaseReturn,
	getPurchaseReturns,
	getPurchaseReturn,
};
