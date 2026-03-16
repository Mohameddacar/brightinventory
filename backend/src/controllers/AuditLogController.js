const auditLogService = require('../services/AuditLogServices');

const createAuditLog = async (req, res) => {
	try {
		await auditLogService.createAuditLog(req.body);
		return res.status(201).json({ message: 'AuditLog created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create auditlog', error: error.message });
	}
};

const updateAuditLog = async (req, res) => {
	try {
		const { id } = req.params;
		await auditLogService.updateAuditLog(id, req.body);
		return res.status(200).json({ message: 'AuditLog updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update auditlog', error: error.message });
	}
};

const deleteAuditLog = async (req, res) => {
	try {
		const { id } = req.params;
		await auditLogService.deleteAuditLog(id);
		return res.status(200).json({ message: 'AuditLog deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete auditlog', error: error.message });
	}
};

const getAuditLogs = async (req, res) => {
	try {
		const rows = await auditLogService.getAllAuditLogs();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch auditlog records', error: error.message });
	}
};

const getAuditLog = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await auditLogService.getAuditLogById(id);

		if (!row) {
			return res.status(404).json({ message: 'AuditLog not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch auditlog', error: error.message });
	}
};

module.exports = {
	createAuditLog,
	updateAuditLog,
	deleteAuditLog,
	getAuditLogs,
	getAuditLog,
};
