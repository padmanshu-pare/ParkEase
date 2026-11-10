const mongoose = require('mongoose');
const Facility = require('../models/Facility');
const Floor = require('../models/Floor');
const ParkingSlot = require('../models/ParkingSlot');
const ParkingLayout = require('../models/ParkingLayout');
const PricingRule = require('../models/PricingRule');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { accessibleFacilityIds, assertFacility } = require('../services/access');

const blankStats = () => ({ total: 0, available: 0, occupied: 0, reserved: 0, maintenance: 0 });

async function slotStats(match, groupField) {
  const rows = await ParkingSlot.aggregate([
    { $match: match },
    { $group: { _id: { g: `$${groupField}`, s: '$status' }, n: { $sum: 1 } } },
  ]);
  const out = {};
  rows.forEach(({ _id, n }) => {
    const key = String(_id.g);
    out[key] = out[key] || blankStats();
    out[key][_id.s] = n;
    out[key].total += n;
  });
  return out;
}
exports.slotStats = slotStats;

exports.listFacilities = asyncHandler(async (req, res) => {
  const ids = await accessibleFacilityIds(req.user);
  const [facilities, stats] = await Promise.all([
    Facility.find({ _id: { $in: ids } }).sort('name').lean(),
    slotStats({ facility: { $in: ids } }, 'facility'),
  ]);
  res.json(facilities.map((f) => ({ ...f, stats: stats[String(f._id)] || blankStats() })));
});

function pickFacility(body) {
  const { name, address, city, openTime, closeTime, isActive } = body;
  const data = { name, address, city, openTime, closeTime, isActive };
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
  return data;
}

exports.createFacility = asyncHandler(async (req, res) => {
  const data = pickFacility(req.body);
  if (!data.name || !data.address) throw httpError(400, 'Facility name and address are required');
  const facility = await Facility.create({ ...data, owner: req.user._id });
  await PricingRule.create({ facility: facility._id });
  await Floor.create({ facility: facility._id, name: 'Ground Floor', level: 0 });
  res.status(201).json(facility);
});

exports.updateFacility = asyncHandler(async (req, res) => {
  await assertFacility(req.user, req.params.id);
  const facility = await Facility.findByIdAndUpdate(req.params.id, pickFacility(req.body), { new: true, runValidators: true });
  if (!facility) throw httpError(404, 'Facility not found');
  res.json(facility);
});

// ---- floors ----
exports.listFloors = asyncHandler(async (req, res) => {
  await assertFacility(req.user, req.params.id);
  const [floors, stats, layouts] = await Promise.all([
    Floor.find({ facility: req.params.id }).sort('level name').lean(),
    slotStats({ facility: new mongoose.Types.ObjectId(req.params.id) }, 'floor'),
    ParkingLayout.find({ facility: req.params.id }).select('floor status').lean(),
  ]);
  const layoutStatus = Object.fromEntries(layouts.map((l) => [String(l.floor), l.status]));
  res.json(floors.map((f) => ({ ...f, stats: stats[String(f._id)] || blankStats(), layoutStatus: layoutStatus[String(f._id)] || 'none' })));
});

exports.createFloor = asyncHandler(async (req, res) => {
  await assertFacility(req.user, req.params.id);
  const { name, level } = req.body;
  if (!name) throw httpError(400, 'Floor name is required');
  const floor = await Floor.create({ facility: req.params.id, name, level: Number(level) || 0 });
  res.status(201).json(floor);
});

async function ownFloor(user, id) {
  const floor = await Floor.findById(id);
  if (!floor) throw httpError(404, 'Floor not found');
  await assertFacility(user, floor.facility);
  return floor;
}

exports.updateFloor = asyncHandler(async (req, res) => {
  const floor = await ownFloor(req.user, req.params.floorId);
  if (req.body.name) floor.name = req.body.name;
  if (req.body.level !== undefined) floor.level = Number(req.body.level) || 0;
  await floor.save();
  res.json(floor);
});

exports.deleteFloor = asyncHandler(async (req, res) => {
  const floor = await ownFloor(req.user, req.params.floorId);
  const busy = await ParkingSlot.countDocuments({ floor: floor._id, status: { $in: ['occupied', 'reserved'] } });
  if (busy) throw httpError(409, 'This floor has occupied or reserved slots. Clear them first.');
  await ParkingSlot.deleteMany({ floor: floor._id });
  await ParkingLayout.deleteOne({ floor: floor._id });
  await floor.deleteOne();
  const total = await ParkingSlot.countDocuments({ facility: floor.facility });
  await Facility.findByIdAndUpdate(floor.facility, { totalCapacity: total });
  res.json({ message: 'Floor deleted' });
});
