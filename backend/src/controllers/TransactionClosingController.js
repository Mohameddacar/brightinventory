const transactionClosingService = require('../services/TransactionClosingServices');

const createTransactionClosing = async (req, res) => {
	try {
		await transactionClosingService.createTransactionClosing(req.body);
		return res.status(201).json({ message: 'TransactionClosing created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create transactionclosing', error: error.message });
	}
};

const updateTransactionClosing = async (req, res) => {
	try {
		const { id } = req.params;
		await transactionClosingService.updateTransactionClosing(id, req.body);
		return res.status(200).json({ message: 'TransactionClosing updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update transactionclosing', error: error.message });
	}
};

const deleteTransactionClosing = async (req, res) => {
	try {
		const { id } = req.params;
		await transactionClosingService.deleteTransactionClosing(id);
		return res.status(200).json({ message: 'TransactionClosing deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete transactionclosing', error: error.message });
	}
};

const getTransactionClosings = async (req, res) => {
	try {
		const rows = await transactionClosingService.getAllTransactionClosings();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch transactionclosing records', error: error.message });
	}
};

const getTransactionClosing = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await transactionClosingService.getTransactionClosingById(id);

		if (!row) {
			return res.status(404).json({ message: 'TransactionClosing not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch transactionclosing', error: error.message });
	}
};

module.exports = {
	createTransactionClosing,
	updateTransactionClosing,
	deleteTransactionClosing,
	getTransactionClosings,
	getTransactionClosing,
};
