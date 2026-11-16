const router = require('express').Router();
const { paymentDetail } = require('../controllers/paymentDetailController');
const { protect, staff } = require('../middleware/auth');

router.use(protect, staff);
router.get('/:id', paymentDetail);

module.exports = router;
