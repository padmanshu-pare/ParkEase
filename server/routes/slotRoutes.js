const router = require('express').Router();
const c = require('../controllers/slotController');
const { protect, staff } = require('../middleware/auth');

router.use(protect, staff);
router.get('/', c.listSlots);
router.patch('/:id/status', c.setStatus);

module.exports = router;
