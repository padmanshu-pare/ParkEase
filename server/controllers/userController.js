const User = require('../models/User');
const Facility = require('../models/Facility');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { accessibleFacilityIds } = require('../services/access');

async function validFacilities(admin, ids = []) {
  const own = (await accessibleFacilityIds(admin)).map(String);
  const bad = ids.filter((id) => !own.includes(String(id)));
  if (bad.length) throw httpError(400, 'One or more facilities do not belong to you');
  return ids;
}

exports.listManagers = asyncHandler(async (req, res) => {
  const managers = await User.find({ role: 'manager', createdBy: req.user._id }).populate('facilities', 'name').sort('-createdAt');
  res.json(managers);
});

exports.createManager = asyncHandler(async (req, res) => {
  const { name, email, phone, password, facilities = [] } = req.body;
  if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
  await validFacilities(req.user, facilities);
  const manager = await User.create({ name, email, phone, password, role: 'manager', facilities, createdBy: req.user._id });
  res.status(201).json({ id: manager._id });
});

exports.updateManager = asyncHandler(async (req, res) => {
  const manager = await User.findOne({ _id: req.params.id, role: 'manager', createdBy: req.user._id });
  if (!manager) throw httpError(404, 'Manager not found');
  const { name, phone, facilities, isActive, password } = req.body;
  if (name !== undefined) manager.name = name;
  if (phone !== undefined) manager.phone = phone;
  if (isActive !== undefined) manager.isActive = Boolean(isActive);
  if (facilities) manager.facilities = await validFacilities(req.user, facilities);
  if (password) {
    if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');
    manager.password = password;
  }
  await manager.save();
  res.json({ message: 'Manager updated' });
});
