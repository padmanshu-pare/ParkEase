const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { normalizeReg } = require('../utils/plate');
const { accessibleFacilityIds, assertFacility } = require('../services/access');
const { findReservationForEntry } = require('../services/reservations');

// Manager panel: list bookings, optionally for one day (YYYY-MM-DD) and status
exports.listReservations = asyncHandler(async (req, res) => {
  const { facility, status, date } = req.query;
  const filter = {};
  if (facility) {
    await assertFacility(req.user, facility);
    filter.facility = new mongoose.Types.ObjectId(facility);
  } else {
    filter.facility = { $in: await accessibleFacilityIds(req.user) };
  }
  if (status) filter.status = status;
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw httpError(400, 'Date must look like 2026-11-12');
    filter.startTime = { $lte: new Date(`${date}T23:59:59.999`) };
    filter.endTime = { $gte: new Date(`${date}T00:00:00`) };
  }
  const items = await Reservation.find(filter)
    .sort(date ? 'startTime' : '-startTime')
    .limit(300)
    .populate('slot', 'name')
    .populate('floor', 'name')
    .populate('driver', 'name phone')
    .lean();
  res.json(items);
});

// Entry screen hint: is this plate booked for this facility right now?
exports.lookupForEntry = asyncHandler(async (req, res) => {
  const { facility } = req.query;
  const regNumber = normalizeReg(req.query.regNumber);
  await assertFacility(req.user, facility);
  const found = await findReservationForEntry(facility, regNumber);
  const reservation = found
    ? await Reservation.findById(found._id).populate('slot', 'name status').populate('floor', 'name').lean()
    : null;
  res.json({ reservation });
});
