const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const asyncHandler = require('../utils/asyncHandler');
const { normalizeReg } = require('../utils/plate');
const { accessibleFacilityIds, assertFacility } = require('../services/access');

exports.listReservations = asyncHandler(async (req, res) => {
  const { facility, status } = req.query;
  const filter = {};
  if (facility) {
    await assertFacility(req.user, facility);
    filter.facility = new mongoose.Types.ObjectId(facility);
  } else filter.facility = { $in: await accessibleFacilityIds(req.user) };
  if (status) filter.status = status;
  res.json(await Reservation.find(filter).sort('-startTime').limit(100).populate('slot', 'name').populate('floor', 'name').lean());
});

// Used by the entry screen: is there a confirmed booking for this vehicle right now?
exports.lookupForEntry = asyncHandler(async (req, res) => {
  const { facility } = req.query;
  const regNumber = normalizeReg(req.query.regNumber);
  await assertFacility(req.user, facility);
  const soon = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const reservation = await Reservation.findOne({
    facility, regNumber, status: 'confirmed', startTime: { $lte: soon }, endTime: { $gte: new Date() },
  }).populate('slot', 'name status').populate('floor', 'name').lean();
  res.json({ reservation });
});
