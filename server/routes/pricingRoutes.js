const router = require('express').Router();
const { getPricing, updatePricing } = require('../controllers/pricingController');
const { protect, staff, adminOnly } = require('../middleware/auth');

router.get('/:facilityId', protect, staff, getPricing);
router.put('/:facilityId', protect, adminOnly, updatePricing);

module.exports = router;
