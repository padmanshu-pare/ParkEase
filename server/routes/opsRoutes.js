const router = require('express').Router();
const { alerts, recent, undo } = require('../controllers/opsController');
const { protect, staff } = require('../middleware/auth');

router.use(protect, staff);
router.get('/alerts', alerts);
router.get('/recent', recent);
router.post('/undo/:id', undo);

module.exports = router;
