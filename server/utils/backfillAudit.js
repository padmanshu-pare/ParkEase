// Creates audit entries for activity that happened before the audit log was switched on.
// Uses the original times from the records. Safe to run more than once (already-created entries are skipped).
// Cannot recover: rate changes and logins from before the audit log existed (no history was kept).
try { require('dotenv').config(); } catch { /* dotenv optional */ }
const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const ParkingRecord = require('../models/ParkingRecord');
const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const User = require('../models/User');

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing');
  await mongoose.connect(process.env.MONGO_URI);

  const done = new Set(await AuditLog.distinct('details.sourceId', { 'details.backfilled': true }));
  const names = new Map((await User.find({}).select('name email role').lean()).map((u) => [String(u._id), u]));
  const who = (id) => {
    const u = id && names.get(String(id));
    return u ? { actor: u._id, actorName: u.name, actorEmail: u.email, actorRole: u.role } : {};
  };
  const docs = [];
  const add = (sourceId, when, base) => {
    if (!when || done.has(sourceId)) return;
    docs.push({ ...base, createdAt: new Date(when), method: 'BACKFILL', status: 200, details: { ...(base.details || {}), backfilled: true, sourceId } });
  };

  // Vehicle entries and exits
  for (const r of await ParkingRecord.find({}).select('regNumber facility entryTime exitTime amount enteredBy exitedBy').lean()) {
    add(`record:${r._id}:entry`, r.entryTime, {
      ...who(r.enteredBy), facility: r.facility, action: 'vehicle.entry', label: 'Vehicle entry',
      details: { regNumber: r.regNumber },
    });
    if (r.exitTime) {
      add(`record:${r._id}:exit`, r.exitTime, {
        ...who(r.exitedBy || r.enteredBy), facility: r.facility, action: 'vehicle.exit', label: 'Vehicle exit and checkout',
        details: { regNumber: r.regNumber, amount: r.amount },
      });
    }
  }

  // Booking payments and cancellations
  for (const p of await Payment.find({ reservation: { $exists: true } }).select('reservation facility amount paidAt regNumber').lean()) {
    add(`payment:${p._id}`, p.paidAt, {
      facility: p.facility, action: 'booking.pay', label: 'Booking payment',
      details: { regNumber: p.regNumber, amount: p.amount },
    });
  }
  for (const b of await Reservation.find({ status: 'cancelled', cancelledAt: { $exists: true } }).select('facility regNumber cancelledAt amount driver').lean()) {
    add(`reservation:${b._id}:cancel`, b.cancelledAt, {
      facility: b.facility, action: 'booking.cancel', label: 'Booking cancelled (refund if paid)',
      details: { regNumber: b.regNumber, amount: b.amount },
    });
  }

  if (docs.length) {
    // Written directly so the original timestamps are kept
    await AuditLog.collection.insertMany(docs);
  }
  console.log(`Audit backfill done. Added ${docs.length} entries. Already present (skipped): ${done.size}.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Audit backfill failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
