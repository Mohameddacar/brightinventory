const permissionService = require('../services/PermissionServices');

const createPermission = async (req, res) => {
	try {
		await permissionService.createPermission(req.body);
		return res.status(201).json({ message: 'Permission created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create permission', error: error.message });
	}
};

const updatePermission = async (req, res) => {
	try {
		const { id } = req.params;
		await permissionService.updatePermission(id, req.body);
		return res.status(200).json({ message: 'Permission updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update permission', error: error.message });
	}
};

const deletePermission = async (req, res) => {
	try {
		const { id } = req.params;
		await permissionService.deletePermission(id);
		return res.status(200).json({ message: 'Permission deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete permission', error: error.message });
	}
};

const getPermissions = async (req, res) => {
	try {
		const rows = await permissionService.getAllPermissions();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch permission records', error: error.message });
	}
};

const getPermission = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await permissionService.getPermissionById(id);

		if (!row) {
			return res.status(404).json({ message: 'Permission not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch permission', error: error.message });
	}
};

module.exports = {
	createPermission,
	updatePermission,
	deletePermission,
	getPermissions,
	getPermission,
};
