const roleService = require('../services/RoleServices');

const createRole = async (req, res) => {
	try {
		await roleService.createRole(req.body);
		return res.status(201).json({ message: 'Role created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create role', error: error.message });
	}
};

const updateRole = async (req, res) => {
	try {
		const { id } = req.params;
		await roleService.updateRole(id, req.body);
		return res.status(200).json({ message: 'Role updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update role', error: error.message });
	}
};

const deleteRole = async (req, res) => {
	try {
		const { id } = req.params;
		await roleService.deleteRole(id);
		return res.status(200).json({ message: 'Role deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete role', error: error.message });
	}
};

const getRoles = async (req, res) => {
	try {
		const rows = await roleService.getAllRoles();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch role records', error: error.message });
	}
};

const getRole = async (req, res) => {
	try {
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
