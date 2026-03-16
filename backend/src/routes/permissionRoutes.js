const express = require('express');
const permissionController = require('../controllers/PermissionController');

const router = express.Router();

router.post('/permissions', permissionController.createPermission);
router.get('/permissions', permissionController.getPermissions);
router.get('/permissions/:id', permissionController.getPermission);
router.put('/permissions/:id', permissionController.updatePermission);
router.delete('/permissions/:id', permissionController.deletePermission);

module.exports = router;
