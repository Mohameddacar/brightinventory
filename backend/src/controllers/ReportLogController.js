const reportLogService = require('../services/ReportLogServices');

const createReportLog = async (req, res) => {
	try {
		await reportLogService.createReportLog(req.body);
		return res.status(201).json({ message: 'ReportLog created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create reportlog', error: error.message });
	}
};

const updateReportLog = async (req, res) => {
	try {
		const { id } = req.params;
		await reportLogService.updateReportLog(id, req.body);
		return res.status(200).json({ message: 'ReportLog updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update reportlog', error: error.message });
	}
};

const deleteReportLog = async (req, res) => {
	try {
		const { id } = req.params;
		await reportLogService.deleteReportLog(id);
		return res.status(200).json({ message: 'ReportLog deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete reportlog', error: error.message });
	}
};

const getReportLogs = async (req, res) => {
	try {
		const rows = await reportLogService.getAllReportLogs();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch reportlog records', error: error.message });
	}
};

const getReportLog = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await reportLogService.getReportLogById(id);

		if (!row) {
			return res.status(404).json({ message: 'ReportLog not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch reportlog', error: error.message });
	}
};

module.exports = {
	createReportLog,
	updateReportLog,
	deleteReportLog,
	getReportLogs,
	getReportLog,
};
