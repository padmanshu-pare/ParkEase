const router = require('express').Router();
const c = require('../controllers/driverController');
const { listFacilities } = require('../controllers/publicController');
const { protect, authorize } = require('../middleware/auth');

const driverOnly = authorize('driver');

// Public: driver sign-up
router.post('/signup', c.signup);

// Everything below needs a logged-in driver
router.use(protect, driverOnly);
router.route('/me').get(c.getProfile).put(c.updateProfile);
router.post('/vehicles', c.addVehicle);
router.delete('/vehicles/:regNumber', c.removeVehicle);
router.get('/facilities', listFacilities);
router.get('/facilities/:id', c.getFacility);
router.route('/reservations').get(c.myReservations).post(c.createReservation);
router.post('/reservations/:id/cancel', c.cancelMine);

module.exports = router;
