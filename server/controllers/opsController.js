const mongoose = require('mongoose');
const ParkingRecord = require('../models/ParkingRecord');
const ParkingSlot = require('../models/ParkingSlot');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { assertFacility } = require('../services/access');
const { emitAvailability } = require('../sockets');

const UNDO_WINDOW_MS = 60 * 1000;
const LONG_STAY_MS = 3 * 60 * 60 * 1000;

// Live warnings for the operator: long stays, pending payments, almost full
exports.alerts = asyncHandler(async (req, res) => {
  const facility = String(req.query.facility || '');
  if (!mongoose.isValidObjectId(facility)) throw httpError(400, 'Choose a facility');
  await assertFacility(req.user, facility);
  const now = Date.now();

  const [longStays, pending, slots] = await Promise.all([
    ParkingRecord.find({ facility, status: 'active', entryTime: { $lt: new Date(now - LONG_STAY_MS) } })
      .populate('slot', 'name').select('regNumber slot entryTime').lean(),
    Reservation.countDocuments({ facility, status: 'pending_payment' }),
    ParkingSlot.find({ facility }).select('status').lean(),
  ]);

  const alerts = [];
  for (const r of longStays) {
    const hours = Math.floor((now - new Date(r.entryTime).getTime()) / 3600000);
    alerts.push({ level: 'warn', text: `${r.regNumber} in slot ${r.slot ? r.slot.name : ''} for ${hours}h` });
  }
  if (pending > 0) alerts.push({ level: 'info', text: `${pending} booking${pending > 1 ? 's' : ''} waiting for payment` });
  const occupied = slots.filter((s) => s.status === 'occupied').length;
  if (slots.length && occupied / slots.length >= 0.9) {
    alerts.push({ level: 'danger', text: `Facility almost full: ${occupied} of ${slots.length} slots taken` });
  }
  res.json({ alerts });
});

// Entries and exits from the last 60 seconds, so staff can undo a mistake
exports.recent = asyncHandler(async (req, res) => {
  const facility = String(req.query.facility || '');
  if (!mongoose.isValidObjectId(facility)) throw httpError(400, 'Choose a facility');
  await assertFacility(req.user, facility);
  const since = new Date(Date.now() - UNDO_WINDOW_MS);
  const rows = await ParkingRecord.find({
    facility,
    $or: [{ status: 'active', entryTime: { $gte: since } }, { status: 'completed', exitTime: { $gte: since } }],
  }).populate('slot', 'name').select('regNumber slot entryTime exitTime status').sort('-entryTime').limit(20).lean();

  res.json({
    actions: rows.map((r) => {
      const isExit = r.status === 'completed';
      return {
        id: r._id, kind: isExit ? 'exit' : 'entry', regNumber: r.regNumber, slot: r.slot ? r.slot.name : '',
        at: isExit ? r.exitTime : r.entryTime,
      };
    }),
  });
});

// Undo an entry (the car is removed again) or an exit (the car is parked again), within 60 seconds
exports.undo = asyncHandler(async (req, res) => {
  const id = String(req.params.id || '');
  if (!mongoose.isValidObjectId(id)) throw httpError(404, 'Record not found');
  const rec = await ParkingRecord.findById(id);
  if (!rec) throw httpError(404, 'Record not found');
  await assertFacility(req.user, String(rec.facility));

  const now = Date.now();
  if (rec.status === 'active') {
    if (now - new Date(rec.entryTime).getTime() > UNDO_WINDOW_MS) throw httpError(409, 'The 60 second undo window has passed');
    await ParkingRecord.deleteOne({ _id: rec._id });
    await ParkingSlot.updateOne({ _id: rec.slot }, { status: 'available', currentRecord: null });
    if (rec.reservation) await Reservation.updateOne({ _id: rec.reservation, status: 'active' }, { status: 'confirmed' });
    emitAvailability(rec.facility, rec.floor);
    return res.json({ undone: 'entry', regNumber: rec.regNumber });
  }

  if (rec.status === 'completed') {
    if (now - new Date(rec.exitTime).getTime() > UNDO_WINDOW_MS) throw httpError(409, 'The 60 second undo window has passed');
    const clash = await ParkingRecord.exists({ regNumber: rec.regNumber, status: 'active' });
    if (clash) throw httpError(409, `${rec.regNumber} is parked again. Undo is not possible.`);
    const slot = await ParkingSlot.findOneAndUpdate(
      { _id: rec.slot, status: 'available' },
      { status: 'occupied', currentRecord: rec._id },
      { new: true }
    );
    if (!slot) throw httpError(409, 'The slot is taken by another car. Undo is not possible.');
    if (rec.payment) await Payment.deleteOne({ _id: rec.payment });
    await ParkingRecord.updateOne({ _id: rec._id }, {
      $set: { status: 'active', amount: 0 },
      $unset: { exitTime: 1, durationMinutes: 1, payment: 1, exitedBy: 1 },
    });
    if (rec.reservation) await Reservation.updateOne({ _id: rec.reservation, status: 'completed' }, { status: 'active' });
    emitAvailability(rec.facility, rec.floor);
    return res.json({ undone: 'exit', regNumber: rec.regNumber });
  }

  throw httpError(409, 'Nothing to undo for this record');
});
