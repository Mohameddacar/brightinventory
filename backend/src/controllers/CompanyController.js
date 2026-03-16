const companyService = require('../services/CompanyServices');

const createCompany = async (req, res) => {
	try {
		await companyService.createCompany(req.body);
		return res.status(201).json({ message: 'Company created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create company', error: error.message });
	}
};

const updateCompany = async (req, res) => {
	try {
		const { id } = req.params;
		await companyService.updateCompany(id, req.body);
		return res.status(200).json({ message: 'Company updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update company', error: error.message });
	}
};

const deleteCompany = async (req, res) => {
	try {
		const { id } = req.params;
		await companyService.deleteCompany(id);
		return res.status(200).json({ message: 'Company deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete company', error: error.message });
	}
};

const getCompanies = async (req, res) => {
	try {
		const rows = await companyService.getAllCompanies();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch company records', error: error.message });
	}
};

const getCompany = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await companyService.getCompanyById(id);

		if (!row) {
			return res.status(404).json({ message: 'Company not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch company', error: error.message });
	}
};

module.exports = {
	createCompany,
	updateCompany,
	deleteCompany,
	getCompanies,
	getCompany,
};
