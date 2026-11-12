const router = require('express').Router();
const { listManagers, createManager, updateManager } = require('../controllers/userController');
const { listDrivers, setDriverActive } = require('../controllers/driverAdminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.route('/managers').get(listManagers).post(createManager);
router.put('/managers/:id', updateManager);
router.get('/drivers', listDrivers);
router.put('/drivers/:id', setDriverActive);

module.exports = router;
