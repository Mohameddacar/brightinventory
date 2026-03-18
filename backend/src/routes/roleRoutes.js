const express = require('express');
const roleController = require('../controllers/RoleController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');

const router = express.Router();

router.use('/roles', authMiddleware);

router.post('/roles', roleController.createRole);
router.get('/roles', roleController.getRoles);
router.get('/roles/:id', roleController.getRole);
router.put('/roles/:id', roleController.updateRole);
router.delete('/roles/:id', roleController.deleteRole);

module.exports = router;
