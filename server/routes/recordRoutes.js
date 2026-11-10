const router = require('express').Router();
const c = require('../controllers/recordController');
const { protect, staff } = require('../middleware/auth');

router.use(protect, staff);
router.get('/', c.listRecords);
router.get('/export', c.exportRecords);
router.get('/lookup', c.lookupActive);
router.post('/entry', c.entry);
router.get('/:id/active', c.getActive);
router.post('/:id/exit', c.exit);

module.exports = router;
