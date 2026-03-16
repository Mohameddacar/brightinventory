const supplierPaymentService = require('../services/SupplierPaymentServices');

const createSupplierPayment = async (req, res) => {
	try {
		await supplierPaymentService.createSupplierPayment(req.body);
		return res.status(201).json({ message: 'SupplierPayment created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create supplierpayment', error: error.message });
	}
};

const updateSupplierPayment = async (req, res) => {
	try {
		const { id } = req.params;
		await supplierPaymentService.updateSupplierPayment(id, req.body);
		return res.status(200).json({ message: 'SupplierPayment updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update supplierpayment', error: error.message });
	}
};

const deleteSupplierPayment = async (req, res) => {
	try {
		const { id } = req.params;
		await supplierPaymentService.deleteSupplierPayment(id);
		return res.status(200).json({ message: 'SupplierPayment deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete supplierpayment', error: error.message });
	}
};

const getSupplierPayments = async (req, res) => {
	try {
		const rows = await supplierPaymentService.getAllSupplierPayments();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch supplierpayment records', error: error.message });
	}
};

const getSupplierPayment = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await supplierPaymentService.getSupplierPaymentById(id);

		if (!row) {
			return res.status(404).json({ message: 'SupplierPayment not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch supplierpayment', error: error.message });
	}
};

module.exports = {
	createSupplierPayment,
	updateSupplierPayment,
	deleteSupplierPayment,
	getSupplierPayments,
	getSupplierPayment,
};
