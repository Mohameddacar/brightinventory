const sponsorService = require('../services/SponsorServices');

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]{1,119}$/;
const MOBILE_PATTERN = /^[+0-9][0-9\-\s]{6,29}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateSponsorPayload = (payload) => {
	const errors = [];

	if (!payload || typeof payload !== 'object') {
		return ['Request payload is invalid'];
	}

	const fullName = String(payload.full_name || '').trim();
	if (!fullName) {
		errors.push('full_name is required');
	} else if (!NAME_PATTERN.test(fullName)) {
		errors.push('full_name is invalid');
	}

	const mobile = String(payload.mobile_no || '').trim();
	if (!mobile) {
		errors.push('mobile_no is required');
	} else if (!MOBILE_PATTERN.test(mobile)) {
		errors.push('mobile_no is invalid');
	}

	const email = String(payload.email || '').trim();
	if (email && !EMAIL_PATTERN.test(email)) {
		errors.push('email is invalid');
	}

	const gender = String(payload.gender || '').toLowerCase();
	if (gender !== 'male' && gender !== 'female') {
		errors.push('gender must be either male or female');
	}

	if (!payload.registered_date || Number.isNaN(new Date(payload.registered_date).getTime())) {
		errors.push('registered_date is required and must be a valid date');
	}

	return errors;
};

const createSponsor = async (req, res) => {
	try {
		const validationErrors = validateSponsorPayload(req.body);
		if (validationErrors.length > 0) {
			return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
		}

		await sponsorService.createSponsor(req.body);
		return res.status(201).json({ message: 'Sponsor created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create sponsor', error: error.message });
	}
};

const updateSponsor = async (req, res) => {
	try {
		const validationErrors = validateSponsorPayload(req.body);
		if (validationErrors.length > 0) {
			return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
		}

		const { id } = req.params;
		const existing = await sponsorService.getSponsorById(id);
		if (!existing) {
			return res.status(404).json({ message: 'Sponsor not found' });
		}

		await sponsorService.updateSponsor(id, req.body);
		return res.status(200).json({ message: 'Sponsor updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update sponsor', error: error.message });
	}
};

const deleteSponsor = async (req, res) => {
	try {
		const { id } = req.params;
		const existing = await sponsorService.getSponsorById(id);
		if (!existing) {
			return res.status(404).json({ message: 'Sponsor not found' });
		}

		await sponsorService.deleteSponsor(id);
		return res.status(200).json({ message: 'Sponsor deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete sponsor', error: error.message });
	}
};

const getSponsors = async (req, res) => {
	try {
		const rows = await sponsorService.getAllSponsors();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch sponsor records', error: error.message });
	}
};

const getSponsor = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await sponsorService.getSponsorById(id);

		if (!row) {
			return res.status(404).json({ message: 'Sponsor not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch sponsor', error: error.message });
	}
};

module.exports = {
	createSponsor,
	updateSponsor,
	deleteSponsor,
	getSponsors,
	getSponsor,
};
