const router = require('express').Router();
const { listManagers, createManager, updateManager } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);
router.route('/managers').get(listManagers).post(createManager);
router.put('/managers/:id', updateManager);

module.exports = router;
