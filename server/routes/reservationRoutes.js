const router = require('express').Router();
const { listReservations, lookupForEntry } = require('../controllers/reservationController');
const { protect, staff } = require('../middleware/auth');

router.use(protect, staff);
router.get('/', listReservations);
router.get('/lookup', lookupForEntry);

module.exports = router;
