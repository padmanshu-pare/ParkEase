const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Facility = require('../models/Facility');
const Reservation = require('../models/Reservation');
const PricingRule = require('../models/PricingRule');
const SlotHold = require('../models/SlotHold');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { normalizeReg, isValidReg } = require('../utils/plate');
const { parseWindow, createReservation, cancelReservation } = require('../services/reservations');
const { availabilitySummary } = require('../services/availability');
const { validatePassword } = require('../services/password');

const MAX_VEHICLES = 5;
const MAX_ACTIVE_BOOKINGS = 5;
const PHONE = /^[0-9+ -]{8,15}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONSENT_VERSION = '2026-11';

// Only accept real strings (blocks object injection such as {"$gt": ""})
const str = (v) => (typeof v === 'string' ? v : '');
const clean = (v, max) => str(v).trim().slice(0, max);

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
const profileOf = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone || '',
  role: u.role,
  vehicles: u.driverVehicles || [],
});

// ---------- ACCOUNT ----------
exports.signup = asyncHandler(async (req, res) => {
  const name = clean(req.body.name, 80);
  const email = clean(req.body.email, 254).toLowerCase();
  const phone = clean(req.body.phone, 15);
  const password = str(req.body.password);

  if (req.body.consent !== true) throw httpError(400, 'Please accept the Privacy Policy and Terms to create an account');
  if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
  if (!EMAIL.test(email)) throw httpError(400, 'Enter a valid email address');
  const pwError = validatePassword(password);
  if (pwError) throw httpError(400, pwError);
  if (phone && !PHONE.test(phone)) throw httpError(400, 'Enter a valid phone number');

  // Generic wording so the form cannot be used to check which emails are registered
  if (await User.exists({ email })) {
    throw httpError(409, 'We could not create an account with these details. Try logging in, or use a different email.');
  }

  const user = await User.create({
    name,
    email,
    phone: phone || undefined,
    password,
    role: 'driver',
    consentAt: new Date(),
    consentVersion: CONSENT_VERSION,
  });
  res.status(201).json({ token: sign(user._id), user: profileOf(user) });
});

exports.getProfile = asyncHandler(async (req, res) => res.json({ user: profileOf(req.user) }));

exports.updateProfile = asyncHandler(async (req, res) => {
  if (req.body.name !== undefined) {
    const name = clean(req.body.name, 80);
    if (!name) throw httpError(400, 'Name cannot be empty');
    req.user.name = name;
  }
  if (req.body.phone !== undefined) {
    const phone = clean(req.body.phone, 15);
    if (phone && !PHONE.test(phone)) throw httpError(400, 'Enter a valid phone number');
    req.user.phone = phone || undefined;
  }
  await req.user.save();
  res.json({ user: profileOf(req.user) });
});

// Right to erasure: cancels upcoming bookings, removes personal details, blocks login.
// Parking history and payments are kept (anonymised) because tax and audit rules require it.
exports.deleteAccount = asyncHandler(async (req, res) => {
  if (str(req.body.confirm) !== 'DELETE') throw httpError(400, 'Type DELETE to confirm');
  const now = new Date();
  const upcoming = await Reservation.find({ driver: req.user._id, status: 'confirmed', endTime: { $gt: now } }).select('_id');
  for (const r of upcoming) await SlotHold.deleteMany({ reservation: r._id });
  await Reservation.updateMany({ driver: req.user._id, status: 'confirmed' }, { $set: { status: 'cancelled', cancelledAt: now, cancelReason: 'Account deleted' } });
  await Reservation.updateMany({ driver: req.user._id }, { $unset: { driver: 1, contactName: 1, contactPhone: 1 } });

  req.user.name = 'Deleted user';
  req.user.email = `deleted-${req.user._id}@removed.invalid`;
  req.user.phone = undefined;
  req.user.driverVehicles = [];
  req.user.isActive = false;
  req.user.deletedAt = now;
  req.user.password = crypto.randomBytes(24).toString('hex'); // invalidates the old password
  await req.user.save();
  res.json({ message: 'Your account has been deleted.' });
});

// ---------- VEHICLES ----------
exports.addVehicle = asyncHandler(async (req, res) => {
  const regNumber = normalizeReg(str(req.body.regNumber));
  if (!isValidReg(regNumber)) throw httpError(400, 'Enter a valid vehicle number');
  if (req.user.driverVehicles.some((v) => v.regNumber === regNumber)) throw httpError(409, 'This vehicle is already saved');
  if (req.user.driverVehicles.length >= MAX_VEHICLES) throw httpError(400, `You can save up to ${MAX_VEHICLES} vehicles`);
  req.user.driverVehicles.push({ regNumber, label: clean(req.body.label, 30) });
  await req.user.save();
  res.status(201).json({ vehicles: req.user.driverVehicles });
});

exports.removeVehicle = asyncHandler(async (req, res) => {
  const regNumber = normalizeReg(str(req.params.regNumber));
  const before = req.user.driverVehicles.length;
  req.user.driverVehicles = req.user.driverVehicles.filter((v) => v.regNumber !== regNumber);
  if (req.user.driverVehicles.length === before) throw httpError(404, 'Vehicle not found');
  await req.user.save();
  res.json({ vehicles: req.user.driverVehicles });
});

// ---------- FACILITIES ----------
exports.getFacility = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'Facility not found');
  const facility = await Facility.findOne({ _id: req.params.id, isActive: true }).select('name address city openTime closeTime').lean();
  if (!facility) throw httpError(404, 'Facility not found');
  const [summary, rule] = await Promise.all([
    availabilitySummary(facility._id),
    PricingRule.findOne({ facility: facility._id }).select('rateType hourlyRate fixedRate baseHours additionalHourlyRate graceMinutes reservationFee').lean(),
  ]);
  res.json({ facility, summary, rule });
});

// ---------- RESERVATIONS ----------
exports.myReservations = asyncHandler(async (req, res) => {
  const items = await Reservation.find({ driver: req.user._id })
    .sort('-startTime')
    .limit(100)
    .populate('facility', 'name address city')
    .populate('slot', 'name')
    .populate('floor', 'name')
    .lean();
  res.json(items);
});

exports.createReservation = asyncHandler(async (req, res) => {
  const facilityId = str(req.body.facilityId);
  const floorId = str(req.body.floorId);
  if (!mongoose.isValidObjectId(facilityId)) throw httpError(400, 'Choose a facility');
  if (floorId && !mongoose.isValidObjectId(floorId)) throw httpError(400, 'Choose a valid floor');

  // Only vehicles saved on the driver's own profile can be booked
  const regNumber = normalizeReg(str(req.body.regNumber));
  const saved = req.user.driverVehicles.find((v) => v.regNumber === regNumber);
  if (!saved) throw httpError(400, 'Add this vehicle in your Profile before booking it');

  const facility = await Facility.findOne({ _id: facilityId, isActive: true }).select('_id').lean();
  if (!facility) throw httpError(404, 'Facility not found or inactive');

  const { start, end } = parseWindow(str(req.body.startTime), str(req.body.endTime));

  const clash = await Reservation.exists({
    driver: req.user._id,
    status: { $in: ['confirmed', 'active'] },
    startTime: { $lt: end },
    endTime: { $gt: start },
  });
  if (clash) throw httpError(409, 'You already have a booking that overlaps this time');

  const active = await Reservation.countDocuments({
    driver: req.user._id,
    status: { $in: ['confirmed', 'active'] },
    endTime: { $gte: new Date() },
  });
  if (active >= MAX_ACTIVE_BOOKINGS) throw httpError(400, `You can have up to ${MAX_ACTIVE_BOOKINGS} active bookings at a time`);

  const reservation = await createReservation({
    driver: req.user,
    facilityId: facility._id,
    floorId: floorId || null,
    start,
    end,
    regNumber,
    vehicleLabel: clean(req.body.vehicleLabel, 30) || saved.label || '',
  });
  res.status(201).json(reservation);
});

exports.cancelMine = asyncHandler(async (req, res) => {
  const id = str(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw httpError(404, 'Booking not found');
  const reservation = await Reservation.findOne({ _id: id, driver: req.user._id });
  if (!reservation) throw httpError(404, 'Booking not found');
  res.json(await cancelReservation(reservation));
});
