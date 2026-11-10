const router = require('express').Router();
const { getDashboard } = require('../controllers/dashboardController');
const { protect, staff } = require('../middleware/auth');

router.get('/', protect, staff, getDashboard);

module.exports = router;
