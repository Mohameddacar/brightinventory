const salesReturnService = require('../services/SalesReturnServices');

const createSalesReturn = async (req, res) => {
	try {
		await salesReturnService.createSalesReturn(req.body);
		return res.status(201).json({ message: 'SalesReturn created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create salesreturn', error: error.message });
	}
};

const updateSalesReturn = async (req, res) => {
	try {
		const { id } = req.params;
		await salesReturnService.updateSalesReturn(id, req.body);
		return res.status(200).json({ message: 'SalesReturn updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update salesreturn', error: error.message });
	}
};

const deleteSalesReturn = async (req, res) => {
	try {
		const { id } = req.params;
		await salesReturnService.deleteSalesReturn(id);
		return res.status(200).json({ message: 'SalesReturn deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete salesreturn', error: error.message });
	}
};

const getSalesReturns = async (req, res) => {
	try {
		const rows = await salesReturnService.getAllSalesReturns();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch salesreturn records', error: error.message });
	}
};

const getSalesReturn = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await salesReturnService.getSalesReturnById(id);

		if (!row) {
			return res.status(404).json({ message: 'SalesReturn not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch salesreturn', error: error.message });
	}
};

module.exports = {
	createSalesReturn,
	updateSalesReturn,
	deleteSalesReturn,
	getSalesReturns,
	getSalesReturn,
};
