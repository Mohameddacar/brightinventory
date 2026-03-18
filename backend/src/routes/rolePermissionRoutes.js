const express = require('express');
const rolePermissionController = require('../controllers/RolePermissionController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');

const router = express.Router();

router.use('/role-permissions', authMiddleware);

router.post('/role-permissions', rolePermissionController.createRolePermission);
router.get('/role-permissions', rolePermissionController.getRolePermissions);
router.get('/role-permissions/:id', rolePermissionController.getRolePermission);
router.put('/role-permissions/:id', rolePermissionController.updateRolePermission);
router.delete('/role-permissions/:id', rolePermissionController.deleteRolePermission);

module.exports = router;
