const User = require('../models/User');
const Reservation = require('../models/Reservation');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.listDrivers = asyncHandler(async (req, res) => {
  const drivers = await User.find({ role: 'driver' })
    .select('name email phone isActive createdAt driverVehicles')
    .sort('-createdAt')
    .lean();
  const stats = await Reservation.aggregate([
    { $match: { driver: { $in: drivers.map((d) => d._id) } } },
    {
      $group: {
        _id: '$driver',
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $in: ['$status', ['confirmed', 'active']] }, 1, 0] } },
        lastBooking: { $max: '$startTime' },
      },
    },
  ]);
  const byDriver = new Map(stats.map((s) => [String(s._id), s]));
  res.json(
    drivers.map((d) => {
      const s = byDriver.get(String(d._id));
      return {
        ...d,
        vehicleCount: (d.driverVehicles || []).length,
        reservations: s ? s.total : 0,
        activeReservations: s ? s.active : 0,
        lastBooking: s ? s.lastBooking : null,
      };
    })
  );
});

exports.setDriverActive = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') throw httpError(400, 'isActive must be true or false');
  const driver = await User.findOneAndUpdate({ _id: req.params.id, role: 'driver' }, { isActive }, { new: true }).select('name email isActive');
  if (!driver) throw httpError(404, 'Driver not found');
  res.json(driver);
});
