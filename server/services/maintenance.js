// Background jobs: no-show bookings and data retention. Runs inside the API process, once an hour.
const ParkingRecord = require('../models/ParkingRecord');
const Reservation = require('../models/Reservation');

const HOUR = 60 * 60 * 1000;
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS) || 365;

// A booking that was never entered and whose time has passed becomes "expired"
async function expireNoShows(now = new Date()) {
  const r = await Reservation.updateMany({ status: 'confirmed', endTime: { $lt: now } }, { $set: { status: 'expired' } });
  return r.modifiedCount || 0;
}

// After the retention period, remove personal contact details from old parking records.
// Plate number and amounts stay so revenue and history totals still add up.
async function anonymizeOldRecords(now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * HOUR);
  const r = await ParkingRecord.updateMany(
    { exitTime: { $lt: cutoff }, $or: [{ ownerName: { $nin: [null, ''] } }, { ownerPhone: { $nin: [null, ''] } }] },
    { $unset: { ownerName: 1, ownerPhone: 1 } }
  );
  return r.modifiedCount || 0;
}

async function runMaintenance() {
  try {
    const expired = await expireNoShows();
    const anonymized = await anonymizeOldRecords();
    if (expired || anonymized) console.log(`[maintenance] expired ${expired} bookings, anonymized ${anonymized} records`);
  } catch (err) {
    console.error('[maintenance] failed:', err.message);
  }
}

function start() {
  setTimeout(runMaintenance, 10 * 1000).unref();
  setInterval(runMaintenance, HOUR).unref();
}

module.exports = { start, runMaintenance, expireNoShows, anonymizeOldRecords };
