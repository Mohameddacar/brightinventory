const customerReceiptService = require('../services/CustomerReceiptServices');

const createCustomerReceipt = async (req, res) => {
	try {
		await customerReceiptService.createCustomerReceipt(req.body);
		return res.status(201).json({ message: 'CustomerReceipt created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create customerreceipt', error: error.message });
	}
};

const updateCustomerReceipt = async (req, res) => {
	try {
		const { id } = req.params;
		await customerReceiptService.updateCustomerReceipt(id, req.body);
		return res.status(200).json({ message: 'CustomerReceipt updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update customerreceipt', error: error.message });
	}
};

const deleteCustomerReceipt = async (req, res) => {
	try {
		const { id } = req.params;
		await customerReceiptService.deleteCustomerReceipt(id);
		return res.status(200).json({ message: 'CustomerReceipt deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete customerreceipt', error: error.message });
	}
};

const getCustomerReceipts = async (req, res) => {
	try {
		const rows = await customerReceiptService.getAllCustomerReceipts();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch customerreceipt records', error: error.message });
	}
};

const getCustomerReceipt = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await customerReceiptService.getCustomerReceiptById(id);

		if (!row) {
			return res.status(404).json({ message: 'CustomerReceipt not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch customerreceipt', error: error.message });
	}
};

module.exports = {
	createCustomerReceipt,
	updateCustomerReceipt,
	deleteCustomerReceipt,
	getCustomerReceipts,
	getCustomerReceipt,
};
