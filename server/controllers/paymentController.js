const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const { normalizeReg, escapeRegex } = require('../utils/plate');
const { accessibleFacilityIds, assertFacility } = require('../services/access');

exports.listPayments = asyncHandler(async (req, res) => {
  const { facility, method, status, from, to, regNumber } = req.query;
  const filter = {};
  if (facility) {
    await assertFacility(req.user, facility);
    filter.facility = facility;
  } else {
    filter.facility = { $in: await accessibleFacilityIds(req.user) };
  }
  if (method) filter.method = method;
  if (status) filter.status = status;
  if (regNumber) filter.regNumber = new RegExp(escapeRegex(normalizeReg(regNumber)));
  if (from || to) {
    filter.paidAt = {};
    if (from) filter.paidAt.$gte = new Date(`${from}T00:00:00`);
    if (to) filter.paidAt.$lte = new Date(`${to}T23:59:59.999`);
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 15);
  const [items, total, sums] = await Promise.all([
    Payment.find(filter).sort('-paidAt').skip((page - 1) * limit).limit(limit).populate('facility', 'name').lean(),
    Payment.countDocuments(filter),
    Payment.aggregate([
      { $match: { ...filter, status: 'successful' } },
      { $group: { _id: '$method', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);
  const summary = { total: 0, cash: 0, upi: 0, card: 0, online: 0 };
  sums.forEach((s) => { summary[s._id] = s.amount; summary.total += s.amount; });
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), summary });
});
