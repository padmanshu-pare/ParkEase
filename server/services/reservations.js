const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const SlotHold = require('../models/SlotHold');
const ParkingSlot = require('../models/ParkingSlot');
const PricingRule = require('../models/PricingRule');
const httpError = require('../utils/httpError');
const { BUCKET_MS, LOOKAHEAD_MS, bucketsBetween } = require('./availability');
const { emitAvailability } = require('../sockets');

const MIN_MINUTES = 30;
const MAX_MINUTES = 12 * 60;
const MAX_ADVANCE_MS = 30 * 24 * 3600 * 1000;
const CANCEL_CUTOFF_MS = 60 * 60 * 1000; // drivers can cancel up to 1 hour before start
const MAX_CANDIDATES = 100;
const HOLD_RETENTION_MS = 24 * 3600 * 1000;

function parseWindow(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start) || isNaN(end)) throw httpError(400, 'Enter a valid start and end time');
  const minutes = (end - start) / 60000;
  if (minutes < MIN_MINUTES || minutes > MAX_MINUTES) throw httpError(400, 'A booking must be between 30 minutes and 12 hours');
  if (start.getTime() % BUCKET_MS !== 0 || end.getTime() % BUCKET_MS !== 0) {
    throw httpError(400, 'Start and end must be on the half hour (for example 10:00 or 10:30)');
  }
  if (start.getTime() < Date.now() - 60000) throw httpError(400, 'The start time is in the past');
  if (start.getTime() > Date.now() + MAX_ADVANCE_MS) throw httpError(400, 'You can book up to 30 days in advance');
  return { start, end };
}

// Used by vehicle entry: is this plate booked for this facility around now?
async function findReservationForEntry(facilityId, regNumber, now = new Date()) {
  return Reservation.findOne({
    facility: facilityId,
    regNumber,
    status: 'confirmed',
    startTime: { $lte: new Date(now.getTime() + LOOKAHEAD_MS) },
    endTime: { $gte: now },
  });
}

async function createReservation({ driver, facilityId, floorId, start, end, regNumber, vehicleLabel }) {
  const rule = await PricingRule.findOne({ facility: facilityId }).lean();
  const amount = Number(rule && rule.reservationFee) || 0;

  const filter = { facility: facilityId, status: 'available' };
  if (floorId) filter.floor = floorId;
  const candidates = await ParkingSlot.find(filter).sort('name').limit(MAX_CANDIDATES).select('_id name floor').lean();
  if (!candidates.length) throw httpError(409, 'No parking slots are free for this booking');

  const buckets = bucketsBetween(start, end);
  const reservationId = new mongoose.Types.ObjectId();
  const expireAt = new Date(end.getTime() + HOLD_RETENTION_MS);

  // Try slots one by one. A duplicate-key error means another booking already holds that block.
  for (const slot of candidates) {
    try {
      await SlotHold.insertMany(
        buckets.map((bucket) => ({ facility: facilityId, slot: slot._id, bucket, reservation: reservationId, expireAt })),
        { ordered: true }
      );
    } catch (err) {
      await SlotHold.deleteMany({ reservation: reservationId });
      if (err.code === 11000) continue;
      throw err;
    }

    try {
      const reservation = await Reservation.create({
        _id: reservationId,
        facility: facilityId,
        floor: slot.floor,
        slot: slot._id,
        driver: driver._id,
        regNumber,
        vehicleLabel,
        contactName: driver.name,
        contactPhone: driver.phone,
        startTime: start,
        endTime: end,
        status: 'confirmed',
        amount,
      });
      emitAvailability(facilityId, slot.floor);
      return reservation;
    } catch (err) {
      await SlotHold.deleteMany({ reservation: reservationId });
      throw err;
    }
  }
  throw httpError(409, 'No slot is free for the whole of this time. Try a shorter or different time.');
}

async function cancelReservation(reservation, reason = 'Cancelled by driver') {
  if (Date.now() > new Date(reservation.startTime).getTime() - CANCEL_CUTOFF_MS) {
    throw httpError(409, 'Cancellation is allowed up to 1 hour before the start time');
  }
  const updated = await Reservation.findOneAndUpdate(
    { _id: reservation._id, status: 'confirmed' },
    { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason },
    { new: true }
  );
  if (!updated) throw httpError(409, 'This booking can no longer be cancelled');
  await SlotHold.deleteMany({ reservation: reservation._id });
  emitAvailability(reservation.facility, reservation.floor);
  return updated;
}

module.exports = { parseWindow, createReservation, cancelReservation, findReservationForEntry };
