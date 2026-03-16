const userService = require('../services/UserServices');

const createUser = async (req, res) => {
	try {
		await userService.createUser(req.body);
		return res.status(201).json({ message: 'User created successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to create user', error: error.message });
	}
};

const updateUser = async (req, res) => {
	try {
		const { id } = req.params;
		await userService.updateUser(id, req.body);
		return res.status(200).json({ message: 'User updated successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to update user', error: error.message });
	}
};

const deleteUser = async (req, res) => {
	try {
		const { id } = req.params;
		await userService.deleteUser(id);
		return res.status(200).json({ message: 'User deleted successfully' });
	} catch (error) {
		return res.status(500).json({ message: 'Failed to delete user', error: error.message });
	}
};

const getUsers = async (req, res) => {
	try {
		const rows = await userService.getAllUsers();
		return res.status(200).json(rows);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch user records', error: error.message });
	}
};

const getUser = async (req, res) => {
	try {
		const { id } = req.params;
		const row = await userService.getUserById(id);

		if (!row) {
			return res.status(404).json({ message: 'User not found' });
		}

		return res.status(200).json(row);
	} catch (error) {
		return res.status(500).json({ message: 'Failed to fetch user', error: error.message });
	}
};

module.exports = {
	createUser,
	updateUser,
	deleteUser,
	getUsers,
	getUser,
};
