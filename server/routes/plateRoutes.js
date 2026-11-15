const router = require('express').Router();
const { readPlate } = require('../controllers/plateController');
const { protect, staff } = require('../middleware/auth');

router.use(protect, staff);
router.post('/read', readPlate);

module.exports = router;
