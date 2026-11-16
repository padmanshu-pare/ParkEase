const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const ParkingRecord = require('../models/ParkingRecord');
const Reservation = require('../models/Reservation');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { assertFacility } = require('../services/access');

// Everything about one payment: the car's visit (entry, exit, slot, time parked) and any booking
exports.paymentDetail = asyncHandler(async (req, res) => {
  const id = String(req.params.id || '');
  if (!mongoose.isValidObjectId(id)) throw httpError(404, 'Payment not found');
  const p = await Payment.findById(id).lean();
  if (!p) throw httpError(404, 'Payment not found');
  await assertFacility(req.user, String(p.facility));

  const [rec, booking] = await Promise.all([
    p.record
      ? ParkingRecord.findById(p.record).populate('slot', 'name').populate('floor', 'name').populate('facility', 'name').lean()
      : null,
    p.reservation ? Reservation.findById(p.reservation).select('startTime endTime status amount').lean() : null,
  ]);

  res.json({
    payment: {
      id: p._id, amount: p.amount, method: p.method, status: p.status, transactionId: p.transactionId,
      receiptNo: p.receiptNo, paidAt: p.paidAt, refundedAt: p.refundedAt, gateway: p.gateway, regNumber: p.regNumber,
    },
    record: rec ? {
      regNumber: rec.regNumber, facility: rec.facility && rec.facility.name, floor: rec.floor && rec.floor.name,
      slot: rec.slot && rec.slot.name, entryTime: rec.entryTime, exitTime: rec.exitTime,
      durationMinutes: rec.durationMinutes, status: rec.status, ownerName: rec.ownerName, ownerPhone: rec.ownerPhone,
    } : null,
    booking: booking ? { startTime: booking.startTime, endTime: booking.endTime, status: booking.status, amount: booking.amount } : null,
  });
});
