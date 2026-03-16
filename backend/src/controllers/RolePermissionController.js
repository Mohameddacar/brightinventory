const rolePermissionService = require('../services/RolePermissionServices');

const createRolePermission = async (req, res) => {
	try {
		await rolePermissionService.createRolePermission(req.body);
		return res.status(201).json({ message: 'RolePermission created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create rolepermission', error: error.message });
	}
};

const updateRolePermission = async (req, res) => {
	try {
		const { id } = req.params;
		await rolePermissionService.updateRolePermission(id, req.body);
		return res.status(200).json({ message: 'RolePermission updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update rolepermission', error: error.message });
	}
};

const deleteRolePermission = async (req, res) => {
	try {
		const { id } = req.params;
		await rolePermissionService.deleteRolePermission(id);
		return res.status(200).json({ message: 'RolePermission deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete rolepermission', error: error.message });
	}
};

const getRolePermissions = async (req, res) => {
	try {
		const rows = await rolePermissionService.getAllRolePermissions();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch rolepermission records', error: error.message });
	}
};

const getRolePermission = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await rolePermissionService.getRolePermissionById(id);

		if (!row) {
			return res.status(404).json({ message: 'RolePermission not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch rolepermission', error: error.message });
	}
};

module.exports = {
	createRolePermission,
	updateRolePermission,
	deleteRolePermission,
	getRolePermissions,
	getRolePermission,
};
