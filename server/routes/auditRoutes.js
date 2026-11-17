const router = require('express').Router();
const { listAudit } = require('../controllers/auditController');
const { protect, staff } = require('../middleware/auth');

// Read-only. There are no routes to change or delete audit entries.
router.use(protect, staff);
router.get('/', listAudit);

module.exports = router;
