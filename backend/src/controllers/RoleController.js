const roleService = require('../services/RoleServices');

const normalizeRoleName = (value) => {
	const raw = String(value || '').trim().toLowerCase();
	if (raw === 'admin') return 'Admin';
	if (raw === 'finance') return 'Finance';
	if (raw === 'receipt') return 'Receipt';
	return null;
};

const validateRolePayload = (payload) => {
	const errors = [];

	if (!payload || typeof payload !== 'object') {
		return ['Request payload is invalid'];
	}

	const roleName = normalizeRoleName(payload.role_name);
	if (!roleName) {
		errors.push('role_name must be one of: Admin, Finance, Receipt');
	}

	return errors;
};

const mapServiceError = (res, error) => {
	if (error?.code === 'INVALID_ROLE_NAME') {
		return res.status(400).json({ message: error.message });
	}

	if (error?.code === 'ROLE_EXISTS') {
		return res.status(409).json({ message: error.message });
	}

	if (error?.code === 'CORE_ROLE_DELETE_BLOCKED') {
		return res.status(400).json({ message: error.message });
	}

	return res.status(500).json({ message: 'Failed to process role request', error: error.message });
};

const createRole = async (req, res) => {
	try {
		const validationErrors = validateRolePayload(req.body);
		if (validationErrors.length > 0) {
			return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
		}

		await roleService.createRole(req.body);
		return res.status(201).json({ message: 'Role created successfully' });
	} catch (error) {
		return mapServiceError(res, error);
	}
};

const updateRole = async (req, res) => {
	try {
		const validationErrors = validateRolePayload(req.body);
		if (validationErrors.length > 0) {
			return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
		}

		const { id } = req.params;
		const existing = await roleService.getRoleById(id);
		if (!existing) {
			return res.status(404).json({ message: 'Role not found' });
		}

		await roleService.updateRole(id, req.body);
		return res.status(200).json({ message: 'Role updated successfully' });
	} catch (error) {
		return mapServiceError(res, error);
	}
};

const deleteRole = async (req, res) => {
	try {
		const { id } = req.params;
		const existing = await roleService.getRoleById(id);
		if (!existing) {
			return res.status(404).json({ message: 'Role not found' });
		}

		await roleService.deleteRole(id);
		return res.status(200).json({ message: 'Role deleted successfully' });
	} catch (error) {
		return mapServiceError(res, error);
	}
};

const getRoles = async (req, res) => {
	try {
		await roleService.ensureCoreRoles();
		const rows = await roleService.getAllRoles();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch role records', error: error.message });
	}
};

const getRole = async (req, res) => {
	try {
		await roleService.ensureCoreRoles();
		const { id } = req.params;
		const row = await roleService.getRoleById(id);

		if (!row) {
			return res.status(404).json({ message: 'Role not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch role', error: error.message });
	}
};

module.exports = {
	createRole,
	updateRole,
	deleteRole,
	getRoles,
	getRole,
};
