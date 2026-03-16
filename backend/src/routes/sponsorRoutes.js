const express = require('express');
const sponsorController = require('../controllers/SponsorController');

const router = express.Router();

router.post('/sponsors', sponsorController.createSponsor);
router.get('/sponsors', sponsorController.getSponsors);
router.get('/sponsors/:id', sponsorController.getSponsor);
router.put('/sponsors/:id', sponsorController.updateSponsor);
router.delete('/sponsors/:id', sponsorController.deleteSponsor);

module.exports = router;
