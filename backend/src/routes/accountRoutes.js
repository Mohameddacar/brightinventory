const express = require('express');
const accountController = require('../controllers/AccountController');

const router = express.Router();

router.post('/accounts', accountController.createAccount);
router.get('/accounts', accountController.getAccounts);
router.get('/accounts/:id', accountController.getAccount);
router.put('/accounts/:id', accountController.updateAccount);
router.delete('/accounts/:id', accountController.deleteAccount);

module.exports = router;
