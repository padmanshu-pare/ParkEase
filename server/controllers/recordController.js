const mongoose = require('mongoose');
const ParkingRecord = require('../models/ParkingRecord');
const ParkingSlot = require('../models/ParkingSlot');
const Vehicle = require('../models/Vehicle');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { normalizeReg, isValidReg, escapeRegex } = require('../utils/plate');
const { accessibleFacilityIds, assertFacility, assertActiveFacility } = require('../services/access');
const { getRule, calculateCharge } = require('../services/pricing');
const { emitAvailability } = require('../sockets');
const { blockedSlotIds } = require('../services/availability');
const { findReservationForEntry } = require('../services/reservations');

const populateRecord = (q) =>
  q.populate('slot', 'name').populate('floor', 'name').populate('facility', 'name address').populate('payment');

// ---------- ENTRY ----------
exports.entry = asyncHandler(async (req, res) => {
  const { facilityId, floorId, slotId, ownerName, ownerPhone, reservationId } = req.body;
  const regNumber = normalizeReg(req.body.regNumber);
  if (!isValidReg(regNumber)) throw httpError(400, 'Enter a valid vehicle number (letters and digits only, 5 to 12 characters)');
  if (!mongoose.isValidObjectId(slotId)) throw httpError(400, 'Select a parking slot');
  await assertActiveFacility(req.user, facilityId);

  if (await ParkingRecord.exists({ regNumber, status: 'active' })) {
    throw httpError(409, `${regNumber} is already parked. Complete its exit before a new entry.`);
  }

  // Booking link: explicit reservationId, or automatically the plate's booking for this facility
  let reservation = null;
  if (reservationId) {
    const now = new Date();
    reservation = await Reservation.findOne({
      _id: reservationId, facility: facilityId, status: 'confirmed', startTime: { $lte: now }, endTime: { $gte: now },
    });
    if (!reservation) throw httpError(404, 'Reservation not found or no longer confirmed');
  } else {
    reservation = await findReservationForEntry(facilityId, regNumber);
  }
  if (reservation && String(reservation.slot) !== String(slotId)) {
    const booked = await ParkingSlot.findById(reservation.slot).select('name').lean();
    throw httpError(409, `This vehicle has a booking for slot ${booked ? booked.name : ''}. Park it in that slot.`);
  }
  // A walk-in cannot take a slot that is held for a booking starting soon
  if (!reservation && (await blockedSlotIds(facilityId)).has(String(slotId))) {
    throw httpError(409, 'This slot is reserved for a booking starting soon. Pick another slot.');
  }
  const slotWasReserved = Boolean(reservation);

  // Atomically claim the slot so two managers can never park into the same slot.
  const claimed = await ParkingSlot.findOneAndUpdate(
    { _id: slotId, facility: facilityId, floor: floorId, status: { $in: slotWasReserved ? ['available', 'reserved'] : ['available'] } },
    { status: 'occupied' },
    { new: true }
  );
  if (!claimed) throw httpError(409, 'This slot is no longer available. Pick another slot.');

  try {
    const set = {};
    if (ownerName) set.ownerName = ownerName;
    if (ownerPhone) set.ownerPhone = ownerPhone;
    const vehicle = await Vehicle.findOneAndUpdate({ regNumber }, { $set: set, $setOnInsert: { regNumber } }, { upsert: true, new: true });

    const record = await ParkingRecord.create({
      facility: facilityId,
      floor: floorId,
      slot: claimed._id,
      vehicle: vehicle._id,
      regNumber,
      ownerName,
      ownerPhone,
      reservation: reservation ? reservation._id : undefined,
      enteredBy: req.user._id,
    });
    await ParkingSlot.updateOne({ _id: claimed._id }, { currentRecord: record._id });
    if (reservation) await Reservation.updateOne({ _id: reservation._id }, { status: 'active' });

    emitAvailability(facilityId, floorId);
    res.status(201).json(await populateRecord(ParkingRecord.findById(record._id)));
  } catch (err) {
    // roll the slot back if anything failed after we claimed it
    await ParkingSlot.updateOne({ _id: claimed._id }, { status: slotWasReserved ? 'reserved' : 'available', currentRecord: null });
    throw err;
  }
});

// ---------- EXIT ----------
async function activeRecordFor(user, filter) {
  const ids = await accessibleFacilityIds(user);
  return populateRecord(ParkingRecord.findOne({ ...filter, status: 'active', facility: { $in: ids } }));
}

function withCharge(record, rule) {
  const charge = calculateCharge(rule, record.entryTime, new Date());
  return { record, minutes: charge.minutes, amount: charge.amount, breakdown: charge.breakdown, rule: { rateType: rule.rateType, graceMinutes: rule.graceMinutes } };
}

exports.lookupActive = asyncHandler(async (req, res) => {
  const regNumber = normalizeReg(req.query.regNumber);
  if (!isValidReg(regNumber)) throw httpError(400, 'Enter a valid vehicle number');
  const record = await activeRecordFor(req.user, { regNumber });
  if (!record) throw httpError(404, `No parked vehicle found with number ${regNumber}`);
  res.json(withCharge(record, await getRule(record.facility._id)));
});

exports.getActive = asyncHandler(async (req, res) => {
  const record = await activeRecordFor(req.user, { _id: req.params.id });
  if (!record) throw httpError(404, 'Active parking record not found');
  res.json(withCharge(record, await getRule(record.facility._id)));
});

exports.exit = asyncHandler(async (req, res) => {
  const { method = 'cash', transactionId } = req.body;
  if (!['cash', 'upi', 'card', 'online'].includes(method)) throw httpError(400, 'Choose a valid payment method');
  const existing = await ParkingRecord.findOne({ _id: req.params.id, status: 'active' });
  if (!existing) throw httpError(404, 'Active parking record not found (it may already be checked out)');
  await assertActiveFacility(req.user, existing.facility);

  // Amount is always recalculated on the server - never trusted from the client.
  const rule = await getRule(existing.facility);
  const exitTime = new Date();
  const charge = calculateCharge(rule, existing.entryTime, exitTime);

  // Completing the record, taking payment and releasing the slot are one operation.
  // A failed payment write must not leave a completed record in an occupied slot.
  const session = await mongoose.startSession();
  let record;
  try {
    await session.withTransaction(async () => {
      record = await ParkingRecord.findOneAndUpdate(
        { _id: existing._id, status: 'active' },
        { status: 'completed', exitTime, durationMinutes: charge.minutes, amount: charge.amount, exitedBy: req.user._id },
        { new: true, session }
      );
      if (!record) throw httpError(409, 'This vehicle has already been checked out');

      if (charge.amount > 0) {
        const stamp = Date.now().toString(36).toUpperCase();
        const [payment] = await Payment.create([{
          facility: record.facility, record: record._id, regNumber: record.regNumber, amount: charge.amount,
          method, status: 'successful', transactionId: transactionId || `${method.toUpperCase()}-${stamp}`,
          receiptNo: `PE-${stamp}-${Math.floor(Math.random() * 900 + 100)}`,
          gateway: 'offline', recordedBy: req.user._id,
        }], { session });
        await ParkingRecord.updateOne({ _id: record._id }, { payment: payment._id }, { session });
      }

      const released = await ParkingSlot.updateOne(
        { _id: record.slot, status: 'occupied', currentRecord: record._id },
        { status: 'available', currentRecord: null },
        { session }
      );
      if (released.modifiedCount !== 1) throw httpError(409, 'Parking slot state changed; checkout was cancelled');
      if (record.reservation) await Reservation.updateOne({ _id: record.reservation }, { status: 'completed' }, { session });
    });
  } finally {
    await session.endSession();
  }
  emitAvailability(record.facility, record.floor);

  res.json({ ...withCharge(await populateRecord(ParkingRecord.findById(record._id)), rule), amount: charge.amount });
});

// ---------- HISTORY ----------
async function buildFilter(req) {
  const { facility, status, regNumber, from, to } = req.query;
  const filter = {};
  if (facility) {
    await assertFacility(req.user, facility);
    filter.facility = facility;
  } else {
    filter.facility = { $in: await accessibleFacilityIds(req.user) };
  }
  if (['active', 'completed'].includes(status)) filter.status = status;
  if (regNumber) filter.regNumber = new RegExp(escapeRegex(normalizeReg(regNumber)));
  if (from || to) {
    filter.entryTime = {};
    if (from) filter.entryTime.$gte = new Date(`${from}T00:00:00`);
    if (to) filter.entryTime.$lte = new Date(`${to}T23:59:59.999`);
  }
  return filter;
}

exports.listRecords = asyncHandler(async (req, res) => {
  const filter = await buildFilter(req);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 15);
  const [items, total] = await Promise.all([
    populateRecord(ParkingRecord.find(filter).sort('-entryTime').skip((page - 1) * limit).limit(limit)).lean(),
    ParkingRecord.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

exports.exportRecords = asyncHandler(async (req, res) => {
  const filter = await buildFilter(req);
  const rows = await populateRecord(ParkingRecord.find(filter).sort('-entryTime').limit(5000)).lean();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Vehicle', 'Facility', 'Floor', 'Slot', 'Owner', 'Phone', 'Entry', 'Exit', 'Minutes', 'Amount', 'Payment method', 'Payment status', 'Status'];
  const lines = rows.map((r) =>
    [
      r.regNumber, r.facility?.name, r.floor?.name, r.slot?.name, r.ownerName, r.ownerPhone,
      r.entryTime?.toISOString(), r.exitTime?.toISOString() || '', r.durationMinutes ?? '', r.amount,
      r.payment?.method || '', r.payment?.status || (r.amount ? '' : 'no charge'), r.status,
    ].map(esc).join(',')
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="parking-records.csv"');
  res.send([head.join(','), ...lines].join('\n'));
});
