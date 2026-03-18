const express = require('express');
const companyController = require('../controllers/CompanyController');
const { handleCompanyLogoUpload } = require('../middlewares/companyLogoUpload');

const router = express.Router();

router.post('/companies/upload-logo', handleCompanyLogoUpload, companyController.uploadLogo);
router.post('/companies', companyController.createCompany);
router.get('/companies', companyController.getCompanies);
router.get('/companies/:id', companyController.getCompany);
router.put('/companies/:id', companyController.updateCompany);
router.delete('/companies/:id', companyController.deleteCompany);

module.exports = router;
