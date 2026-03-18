const express = require('express');
const accessControlController = require('../controllers/AccessControlController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');

const router = express.Router();

router.use('/access-control', authMiddleware);

router.get('/access-control/catalog', accessControlController.getPermissionCatalog);
router.post('/access-control/catalog/modules', accessControlController.createModulePermissions);
router.get('/access-control/roles/:roleId/permissions', accessControlController.getRolePermissionMatrix);
router.put('/access-control/roles/:roleId/permissions', accessControlController.saveRolePermissions);
router.get('/access-control/users/:userId/permissions', accessControlController.getUserPermissionMatrix);
router.get('/access-control/users/:userId/effective-permissions', accessControlController.getUserEffectivePermissions);
router.put('/access-control/users/:userId/permissions', accessControlController.saveUserPermissions);

module.exports = router;
