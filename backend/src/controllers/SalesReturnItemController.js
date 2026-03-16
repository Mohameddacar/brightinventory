const salesReturnItemService = require('../services/SalesReturnItemServices');

const createSalesReturnItem = async (req, res) => {
	try {
		await salesReturnItemService.createSalesReturnItem(req.body);
		return res.status(201).json({ message: 'SalesReturnItem created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create salesreturnitem', error: error.message });
	}
};

const updateSalesReturnItem = async (req, res) => {
	try {
		const { id } = req.params;
		await salesReturnItemService.updateSalesReturnItem(id, req.body);
		return res.status(200).json({ message: 'SalesReturnItem updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update salesreturnitem', error: error.message });
	}
};

const deleteSalesReturnItem = async (req, res) => {
	try {
		const { id } = req.params;
		await salesReturnItemService.deleteSalesReturnItem(id);
		return res.status(200).json({ message: 'SalesReturnItem deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete salesreturnitem', error: error.message });
	}
};

const getSalesReturnItems = async (req, res) => {
	try {
		const rows = await salesReturnItemService.getAllSalesReturnItems();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch salesreturnitem records', error: error.message });
	}
};

const getSalesReturnItem = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await salesReturnItemService.getSalesReturnItemById(id);

		if (!row) {
			return res.status(404).json({ message: 'SalesReturnItem not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch salesreturnitem', error: error.message });
	}
};

module.exports = {
	createSalesReturnItem,
	updateSalesReturnItem,
	deleteSalesReturnItem,
	getSalesReturnItems,
	getSalesReturnItem,
};
