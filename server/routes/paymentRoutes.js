const router = require('express').Router();
const { listPayments } = require('../controllers/paymentController');
const { protect, staff } = require('../middleware/auth');

router.get('/', protect, staff, listPayments);

module.exports = router;
