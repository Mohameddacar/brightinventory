const accessControlService = require('../services/AccessControlServices');

const getPermissionCatalog = async (req, res) => {
  try {
    const modules = await accessControlService.getPermissionCatalog();
    return res.status(200).json({ modules });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load permission catalog', error: error.message });
  }
};

const getUserPermissionMatrix = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ message: 'userId is invalid' });
    }

    const matrix = await accessControlService.getPermissionMatrixForUser(userId);
    if (!matrix) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(matrix);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch user permission matrix', error: error.message });
  }
};

const getUserEffectivePermissions = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ message: 'userId is invalid' });
    }

    const effective = await accessControlService.getEffectivePermissionDataForUser(userId);
    if (!effective) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(effective);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch effective permissions', error: error.message });
  }
};

const saveUserPermissions = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ message: 'userId is invalid' });
    }

    const permissionIds = Array.isArray(req.body?.permission_ids) ? req.body.permission_ids : [];
    const useCustom = req.body?.use_custom !== false;

    const saved = await accessControlService.saveUserCustomPermissions(userId, permissionIds, useCustom);
    return res.status(200).json({ message: 'User permissions updated successfully', data: saved });
  } catch (error) {
    if (error?.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(500).json({ message: 'Failed to update user permissions', error: error.message });
  }
};

const getRolePermissionMatrix = async (req, res) => {
  try {
    const roleId = Number(req.params.roleId);
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return res.status(400).json({ message: 'roleId is invalid' });
    }

    const matrix = await accessControlService.getRolePermissionMatrix(roleId);
    if (!matrix) {
      return res.status(404).json({ message: 'Role not found' });
    }

    return res.status(200).json(matrix);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch role permission matrix', error: error.message });
  }
};

const saveRolePermissions = async (req, res) => {
  try {
    const roleId = Number(req.params.roleId);
    if (!Number.isFinite(roleId) || roleId <= 0) {
      return res.status(400).json({ message: 'roleId is invalid' });
    }

    const permissionIds = Array.isArray(req.body?.permission_ids) ? req.body.permission_ids : [];
    const saved = await accessControlService.saveRolePermissions(roleId, permissionIds);
    return res.status(200).json({ message: 'Role permissions updated successfully', data: saved });
  } catch (error) {
    if (error?.code === 'ROLE_NOT_FOUND') {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (error?.code === 'ADMIN_ROLE_LOCKED') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to update role permissions', error: error.message });
  }
};

const createModulePermissions = async (req, res) => {
  try {
    const created = await accessControlService.createModulePermissions(req.body);
    return res.status(201).json({ message: 'Module permissions created successfully', data: created });
  } catch (error) {
    if (error?.code === 'INVALID_MODULE' || error?.code === 'INVALID_ACTIONS') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Failed to create module permissions', error: error.message });
  }
};

module.exports = {
  getPermissionCatalog,
  getUserPermissionMatrix,
  getUserEffectivePermissions,
  saveUserPermissions,
  getRolePermissionMatrix,
  saveRolePermissions,
  createModulePermissions,
};
