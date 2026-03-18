const express = require('express');
const authController = require('../controllers/AuthController');
const { authMiddleware } = require('../middlewares/AuthMiddleware');

const router = express.Router();

router.post('/auth/login', authController.login);
router.post('/auth/forgot-password', authController.forgotPassword);
router.get('/auth/me', authMiddleware, authController.me);

module.exports = router;
