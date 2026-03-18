const companyService = require('../services/CompanyServices');

const COMPANY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s&'().,-]{1,149}$/;
const CONTACT_PATTERN = /^\+?[0-9\s-]{7,20}$/;

const validateCompanyPayload = (payload) => {
	const errors = [];

	if (!payload || typeof payload !== 'object') {
		return ['Request payload is invalid'];
	}

	const companyName = String(payload.company_name || '').trim();
	if (!companyName) {
		errors.push('company_name is required');
	} else if (!COMPANY_NAME_PATTERN.test(companyName)) {
		errors.push('company_name is invalid');
	}

	const contact = String(payload.contact || '').trim();
	if (contact && !CONTACT_PATTERN.test(contact)) {
		errors.push('contact is invalid');
	}

	const email = String(payload.email || '').trim();
	if (email && !/^\S+@\S+\.\S+$/.test(email)) {
		errors.push('email is invalid');
	}

	return errors;
};

const uploadLogo = async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ message: 'Image file is required' });
		}

		const imagePath = `/uploads/companies/${req.file.filename}`;
		const imageUrl = `${req.protocol}://${req.get('host')}${imagePath}`;

		return res.status(201).json({
			message: 'Logo uploaded successfully',
			image: imagePath,
			image_url: imageUrl,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Failed to upload logo', error: error.message });
	}
};

const createCompany = async (req, res) => {
	try {
		const validationErrors = validateCompanyPayload(req.body);
		if (validationErrors.length > 0) {
			return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
		}

		await companyService.createCompany(req.body);
		return res.status(201).json({ message: 'Company created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create company', error: error.message });
	}
};

const updateCompany = async (req, res) => {
	try {
		const validationErrors = validateCompanyPayload(req.body);
		if (validationErrors.length > 0) {
			return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
		}

		const { id } = req.params;
		const existing = await companyService.getCompanyById(id);
		if (!existing) {
			return res.status(404).json({ message: 'Company not found' });
		}

		await companyService.updateCompany(id, req.body);
		return res.status(200).json({ message: 'Company updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update company', error: error.message });
	}
};

const deleteCompany = async (req, res) => {
	try {
		const { id } = req.params;
		const existing = await companyService.getCompanyById(id);
		if (!existing) {
			return res.status(404).json({ message: 'Company not found' });
		}

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
	uploadLogo,
	createCompany,
	updateCompany,
	deleteCompany,
	getCompanies,
	getCompany,
};
