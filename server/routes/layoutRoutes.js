const router = require('express').Router();
const c = require('../controllers/layoutController');
const { protect, staff } = require('../middleware/auth');

router.use(protect, staff);
router.route('/:floorId').get(c.getLayout).put(c.saveDraft);
router.post('/:floorId/publish', c.publish);
router.post('/:floorId/copy', c.copyLayout);

module.exports = router;