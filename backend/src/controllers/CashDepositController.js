const cashDepositService = require('../services/CashDepositServices');

const createCashDeposit = async (req, res) => {
	try {
		await cashDepositService.createCashDeposit(req.body);
		return res.status(201).json({ message: 'CashDeposit created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create cashdeposit', error: error.message });
	}
};

const updateCashDeposit = async (req, res) => {
	try {
		const { id } = req.params;
		await cashDepositService.updateCashDeposit(id, req.body);
		return res.status(200).json({ message: 'CashDeposit updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update cashdeposit', error: error.message });
	}
};

const deleteCashDeposit = async (req, res) => {
	try {
		const { id } = req.params;
		await cashDepositService.deleteCashDeposit(id);
		return res.status(200).json({ message: 'CashDeposit deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete cashdeposit', error: error.message });
	}
};

const getCashDeposits = async (req, res) => {
	try {
		const rows = await cashDepositService.getAllCashDeposits();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch cashdeposit records', error: error.message });
	}
};

const getCashDeposit = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await cashDepositService.getCashDepositById(id);

		if (!row) {
			return res.status(404).json({ message: 'CashDeposit not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch cashdeposit', error: error.message });
	}
};

module.exports = {
	createCashDeposit,
	updateCashDeposit,
	deleteCashDeposit,
	getCashDeposits,
	getCashDeposit,
};
