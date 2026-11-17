const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { assertFacility, accessibleFacilityIds } = require('../services/access');

// Admins see everything. Managers see only their own facilities.
exports.listAudit = asyncHandler(async (req, res) => {
  const { facility, from, to, action } = req.query;
  const filter = {};
  if (facility) {
    if (!mongoose.isValidObjectId(String(facility))) throw httpError(400, 'Choose a facility');
    await assertFacility(req.user, String(facility));
    filter.facility = new mongoose.Types.ObjectId(String(facility));
  } else if (req.user.role !== 'admin') {
    filter.facility = { $in: await accessibleFacilityIds(req.user) };
  }
  if (action && typeof action === 'string') filter.action = { $regex: `^${action.replace(/[^a-z._]/gi, '')}` };
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(`${String(from)}T00:00:00+05:30`);
    if (to) filter.createdAt.$lte = new Date(`${String(to)}T23:59:59.999+05:30`);
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 25);
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});
