const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const SlotHold = require('../models/SlotHold');
const ParkingSlot = require('../models/ParkingSlot');
const PricingRule = require('../models/PricingRule');
const Payment = require('../models/Payment');
const httpError = require('../utils/httpError');
const { BUCKET_MS, LOOKAHEAD_MS, bucketsBetween } = require('./availability');
const { emitAvailability } = require('../sockets');
const { getGateway } = require('./paymentGateway');

const MIN_MINUTES = 30;
const MAX_MINUTES = 12 * 60;
const MAX_ADVANCE_MS = 30 * 24 * 3600 * 1000;
const CANCEL_CUTOFF_MS = 60 * 60 * 1000; // paid or confirmed bookings: cancel up to 1 hour before start
const PAYMENT_WINDOW_MS = 15 * 60 * 1000; // unpaid bookings hold the slot for 15 minutes
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

// Used by vehicle entry: is this plate booked (and paid) for this facility around now?
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
        // Free bookings are confirmed at once. Paid bookings wait for payment.
        status: amount > 0 ? 'pending_payment' : 'confirmed',
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

// Releases a booking's slot holds and marks it expired (used for unpaid bookings)
async function releaseReservation(id, reason) {
  await SlotHold.deleteMany({ reservation: id });
  const r = await Reservation.findOneAndUpdate(
    { _id: id, status: 'pending_payment' },
    { status: 'expired', cancelReason: reason, cancelledAt: new Date() },
    { new: true }
  );
  if (r) emitAvailability(r.facility, r.floor);
  return r;
}

async function expirePendingPayments(now = new Date()) {
  const cutoff = new Date(now.getTime() - PAYMENT_WINDOW_MS);
  const stale = await Reservation.find({ status: 'pending_payment', createdAt: { $lt: cutoff } }).select('_id').lean();
  for (const r of stale) await releaseReservation(r._id, 'Payment not completed in time');
  return stale.length;
}

// Demo payment. Same steps as a real gateway: create order, verify, record payment, confirm booking.
async function payReservation(reservationId, driverId) {
  const reservation = await Reservation.findOne({ _id: reservationId, driver: driverId });
  if (!reservation) throw httpError(404, 'Booking not found');
  if (reservation.status !== 'pending_payment') throw httpError(409, 'This booking does not need a payment');
  if (Date.now() > new Date(reservation.createdAt).getTime() + PAYMENT_WINDOW_MS) {
    await releaseReservation(reservation._id, 'Payment not completed in time');
    throw httpError(409, 'The 15 minute payment window ran out and the slot was released. Please book again.');
  }

  // Claim the booking first so a double click cannot pay twice
  const claimed = await Reservation.findOneAndUpdate(
    { _id: reservation._id, status: 'pending_payment' },
    { status: 'confirmed' },
    { new: true }
  );
  if (!claimed) throw httpError(409, 'This booking is already paid');

  const gateway = getGateway();
  try {
    const order = await gateway.createOrder({ amount: reservation.amount, receipt: String(reservation._id) });
    const result = await gateway.verifyPayment({ orderId: order.orderId });
    if (!result.verified) throw httpError(402, 'Payment could not be verified');

    const stamp = Date.now().toString(36).toUpperCase();
    const payment = await Payment.create({
      facility: reservation.facility,
      reservation: reservation._id,
      regNumber: reservation.regNumber,
      amount: reservation.amount,
      method: 'online',
      status: 'successful',
      transactionId: result.transactionId,
      receiptNo: `PE-${gateway.isDemo ? 'DEMO-' : ''}${stamp}-${Math.floor(Math.random() * 900 + 100)}`,
      gateway: gateway.name,
      paidAt: new Date(),
    });
    await Reservation.updateOne({ _id: reservation._id }, { payment: payment._id });
    return { reservation: claimed, payment };
  } catch (err) {
    // Put the booking back to unpaid so the driver can try again
    await Reservation.updateOne({ _id: reservation._id, status: 'confirmed', payment: { $exists: false } }, { status: 'pending_payment' });
    throw err;
  }
}

async function cancelReservation(reservation, reason = 'Cancelled by driver') {
  const wasPaid = reservation.status === 'confirmed' && Boolean(reservation.payment);

  if (reservation.status === 'confirmed' && Date.now() > new Date(reservation.startTime).getTime() - CANCEL_CUTOFF_MS) {
    throw httpError(409, 'Cancellation is allowed up to 1 hour before the start time');
  }
  if (!['confirmed', 'pending_payment'].includes(reservation.status)) {
    throw httpError(409, 'This booking can no longer be cancelled');
  }

  const updated = await Reservation.findOneAndUpdate(
    { _id: reservation._id, status: reservation.status },
    { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason },
    { new: true }
  );
  if (!updated) throw httpError(409, 'This booking can no longer be cancelled');
  await SlotHold.deleteMany({ reservation: reservation._id });

  if (wasPaid) {
    const payment = await Payment.findById(reservation.payment);
    if (payment && payment.status === 'successful') {
      const refund = await getGateway().refund({ transactionId: payment.transactionId, amount: payment.amount });
      payment.status = 'refunded';
      payment.refundId = refund.refundId;
      payment.refundedAt = new Date();
      await payment.save();
    }
  }
  emitAvailability(reservation.facility, reservation.floor);
  return updated;
}

module.exports = {
  parseWindow,
  createReservation,
  cancelReservation,
  findReservationForEntry,
  payReservation,
  expirePendingPayments,
  PAYMENT_WINDOW_MS,
};
