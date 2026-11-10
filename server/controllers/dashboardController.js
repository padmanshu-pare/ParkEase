const mongoose = require('mongoose');
const Floor = require('../models/Floor');
const ParkingRecord = require('../models/ParkingRecord');
const Reservation = require('../models/Reservation');
const asyncHandler = require('../utils/asyncHandler');
const { assertFacility } = require('../services/access');
const { slotStats } = require('./facilityController');

exports.getDashboard = asyncHandler(async (req, res) => {
  const { facility } = req.query;
  await assertFacility(req.user, facility);
  const fid = new mongoose.Types.ObjectId(facility);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [byFacility, byFloor, floors, vehiclesToday, recentRecords, recentReservations] = await Promise.all([
    slotStats({ facility: fid }, 'facility'),
    slotStats({ facility: fid }, 'floor'),
    Floor.find({ facility: fid }).sort('level name').lean(),
    ParkingRecord.countDocuments({ facility: fid, entryTime: { $gte: startOfDay } }),
    ParkingRecord.find({ facility: fid }).sort('-entryTime').limit(6).populate('slot', 'name').populate('floor', 'name').lean(),
    Reservation.find({ facility: fid }).sort('-createdAt').limit(5).populate('slot', 'name').populate('floor', 'name').lean(),
  ]);

  const empty = { total: 0, available: 0, occupied: 0, reserved: 0, maintenance: 0 };
  res.json({
    stats: { ...(byFacility[String(fid)] || empty), vehiclesToday },
    floors: floors.map((f) => ({ _id: f._id, name: f.name, stats: byFloor[String(f._id)] || empty })),
    recentRecords,
    recentReservations,
  });
});
