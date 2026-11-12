const mongoose = require('mongoose');
const ParkingSlot = require('../models/ParkingSlot');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { accessibleFacilityIds, assertFacility, assertActiveFacility } = require('../services/access');
const { escapeRegex } = require('../utils/plate');
const { emitAvailability } = require('../sockets');

exports.listSlots = asyncHandler(async (req, res) => {
  const { facility, floor, status, search } = req.query;
  const filter = {};
  if (facility) {
    await assertFacility(req.user, facility);
    filter.facility = facility;
  } else {
    filter.facility = { $in: await accessibleFacilityIds(req.user) };
  }
  if (floor && mongoose.isValidObjectId(floor)) filter.floor = floor;
  if (status) filter.status = status;
  if (search) filter.name = new RegExp(escapeRegex(search.trim()), 'i');

  const slots = await ParkingSlot.find(filter)
    .populate('floor', 'name level')
    .populate({ path: 'currentRecord', select: 'regNumber entryTime ownerName ownerPhone' })
    .sort('floor name')
    .lean();
  res.json(slots);
});

exports.setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['available', 'reserved', 'maintenance'].includes(status)) {
    throw httpError(400, 'Status can be set manually to available, reserved or maintenance. Occupied is set by vehicle entry.');
  }
  const slot = await ParkingSlot.findById(req.params.id);
  if (!slot) throw httpError(404, 'Slot not found');
  await assertActiveFacility(req.user, slot.facility);

  // Atomic: never touch a slot that is occupied by a parked vehicle
  const updated = await ParkingSlot.findOneAndUpdate({ _id: slot._id, status: { $ne: 'occupied' } }, { status }, { new: true });
  if (!updated) throw httpError(409, 'This slot is occupied. Complete the vehicle exit first.');
  emitAvailability(slot.facility, slot.floor);
  res.json(updated);
});
