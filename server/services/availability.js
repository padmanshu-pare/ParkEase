const ParkingSlot = require('../models/ParkingSlot');
const Floor = require('../models/Floor');
const SlotHold = require('../models/SlotHold');

const BUCKET_MS = 30 * 60 * 1000;
// A slot with a booking starting inside this window is not given to a walk-in vehicle
const LOOKAHEAD_MS = 3 * 60 * 60 * 1000;

const floorBucket = (d) => new Date(Math.floor(new Date(d).getTime() / BUCKET_MS) * BUCKET_MS);

function bucketsBetween(start, end) {
  const out = [];
  for (let t = floorBucket(start).getTime(); t < end.getTime(); t += BUCKET_MS) out.push(new Date(t));
  return out;
}

// Slots that a walk-in cannot take right now: a booking is running or starts soon
async function blockedSlotIds(facilityId, now = new Date()) {
  const ids = await SlotHold.distinct('slot', {
    facility: facilityId,
    bucket: { $gte: floorBucket(now), $lt: new Date(now.getTime() + LOOKAHEAD_MS) },
  });
  return new Set(ids.map(String));
}

// Live counts used by the public page, driver screens and the dashboard
async function availabilitySummary(facilityId, now = new Date()) {
  const [slots, floors, blocked] = await Promise.all([
    ParkingSlot.find({ facility: facilityId }).select('floor status').lean(),
    Floor.find({ facility: facilityId }).sort('level name').select('name level').lean(),
    blockedSlotIds(facilityId, now),
  ]);

  const byFloor = new Map(
    floors.map((f) => [String(f._id), { id: f._id, name: f.name, level: f.level, total: 0, free: 0, occupied: 0, reserved: 0, maintenance: 0 }])
  );
  const totals = { total: 0, free: 0, occupied: 0, reserved: 0, maintenance: 0 };

  for (const s of slots) {
    const floor = byFloor.get(String(s.floor));
    if (!floor) continue;
    let key;
    if (s.status === 'occupied') key = 'occupied';
    else if (s.status === 'maintenance') key = 'maintenance';
    else if (s.status === 'reserved' || blocked.has(String(s._id))) key = 'reserved';
    else key = 'free';
    floor.total++;
    floor[key]++;
    totals.total++;
    totals[key]++;
  }
  return { ...totals, floors: [...byFloor.values()], updatedAt: now };
}

module.exports = { BUCKET_MS, LOOKAHEAD_MS, floorBucket, bucketsBetween, blockedSlotIds, availabilitySummary };
