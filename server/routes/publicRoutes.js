const router = require('express').Router();
const { listFacilities, availability } = require('../controllers/publicController');

// No login needed. Returns counts only, never vehicle or driver details.
router.get('/facilities', listFacilities);
router.get('/facilities/:id/availability', availability);

module.exports = router;
