const express = require('express');
const companyController = require('../controllers/CompanyController');

const router = express.Router();

router.post('/companies', companyController.createCompany);
router.get('/companies', companyController.getCompanies);
router.get('/companies/:id', companyController.getCompany);
router.put('/companies/:id', companyController.updateCompany);
router.delete('/companies/:id', companyController.deleteCompany);

module.exports = router;
