const express = require('express');
const userController = require('../controllers/UserController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');

const router = express.Router();

router.use('/users', authMiddleware);

router.post('/users', userController.createUser);
router.get('/users', userController.getUsers);
router.get('/users/:id', userController.getUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

module.exports = router;
