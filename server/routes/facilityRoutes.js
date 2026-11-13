const router = require('express').Router();
const c = require('../controllers/facilityController');
const { protect, staff, adminOnly } = require('../middleware/auth');

router.use(protect, staff);
router.route('/').get(c.listFacilities).post(adminOnly, c.createFacility);
router.put('/:id', adminOnly, c.updateFacility);
router.route('/:id/floors').get(c.listFloors).post(c.createFloor);
router.route('/floors/:floorId').put(adminOnly, c.updateFloor).delete(adminOnly, c.deleteFloor);

module.exports = router;
