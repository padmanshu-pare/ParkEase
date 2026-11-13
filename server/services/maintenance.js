// Background jobs run inside the API process.
// Every minute: release unpaid bookings after 15 minutes, expire bookings that were never used.
// Every hour: remove personal details from old parking records.
const Reservation = require('../models/Reservation');
const ParkingRecord = require('../models/ParkingRecord');
const { expirePendingPayments } = require('./reservations');

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS) || 365;

async function expireNoShows(now = new Date()) {
  const r = await Reservation.updateMany({ status: 'confirmed', endTime: { $lt: now } }, { $set: { status: 'expired' } });
  return r.modifiedCount || 0;
}

async function anonymizeOldRecords(now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * HOUR);
  const r = await ParkingRecord.updateMany(
    { exitTime: { $lt: cutoff }, $or: [{ ownerName: { $nin: [null, ''] } }, { ownerPhone: { $nin: [null, ''] } }] },
    { $unset: { ownerName: 1, ownerPhone: 1 } }
  );
  return r.modifiedCount || 0;
}

async function everyMinute() {
  try {
    const pending = await expirePendingPayments();
    const noShows = await expireNoShows();
    if (pending || noShows) console.log(`[maintenance] released ${pending} unpaid, expired ${noShows} no-shows`);
  } catch (err) {
    console.error('[maintenance] minute job failed:', err.message);
  }
}

async function hourly() {
  try {
    const anonymized = await anonymizeOldRecords();
    if (anonymized) console.log(`[maintenance] anonymized ${anonymized} old records`);
  } catch (err) {
    console.error('[maintenance] hourly job failed:', err.message);
  }
}

function start() {
  setTimeout(everyMinute, 10 * 1000).unref();
  setInterval(everyMinute, MINUTE).unref();
  setInterval(hourly, HOUR).unref();
}

module.exports = { start, everyMinute, hourly, expireNoShows, anonymizeOldRecords };
