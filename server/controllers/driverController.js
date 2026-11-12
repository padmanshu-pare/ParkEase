const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Facility = require('../models/Facility');
const Reservation = require('../models/Reservation');
const PricingRule = require('../models/PricingRule');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');
const { normalizeReg, isValidReg } = require('../utils/plate');
const { parseWindow, createReservation, cancelReservation } = require('../services/reservations');

const MAX_VEHICLES = 5;
const MAX_ACTIVE_BOOKINGS = 5;
const PHONE = /^[0-9+ -]{8,15}$/;

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
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) throw httpError(400, 'Name, email and password are required');
  if (String(password).length < 6) throw httpError(400, 'Password must be at least 6 characters');
  if (phone && !PHONE.test(String(phone))) throw httpError(400, 'Enter a valid phone number');
  const cleanEmail = String(email).toLowerCase().trim();
  if (await User.exists({ email: cleanEmail })) throw httpError(409, 'An account with this email already exists');

  const user = await User.create({
    name: String(name).trim(),
    email: cleanEmail,
    phone: phone ? String(phone).trim() : undefined,
    password: String(password),
    role: 'driver',
  });
  res.status(201).json({ token: sign(user._id), user: profileOf(user) });
});

exports.getProfile = asyncHandler(async (req, res) => res.json({ user: profileOf(req.user) }));

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name !== undefined) {
    if (!String(name).trim()) throw httpError(400, 'Name cannot be empty');
    req.user.name = String(name).trim();
  }
  if (phone !== undefined) {
    if (phone && !PHONE.test(String(phone))) throw httpError(400, 'Enter a valid phone number');
    req.user.phone = phone ? String(phone).trim() : undefined;
  }
  await req.user.save();
  res.json({ user: profileOf(req.user) });
});

// ---------- VEHICLES ----------
exports.addVehicle = asyncHandler(async (req, res) => {
  const regNumber = normalizeReg(req.body.regNumber);
  if (!isValidReg(regNumber)) throw httpError(400, 'Enter a valid vehicle number');
  if (req.user.driverVehicles.some((v) => v.regNumber === regNumber)) throw httpError(409, 'This vehicle is already saved');
  if (req.user.driverVehicles.length >= MAX_VEHICLES) throw httpError(400, `You can save up to ${MAX_VEHICLES} vehicles`);
  req.user.driverVehicles.push({ regNumber, label: String(req.body.label || '').trim().slice(0, 30) });
  await req.user.save();
  res.status(201).json({ vehicles: req.user.driverVehicles });
});

exports.removeVehicle = asyncHandler(async (req, res) => {
  const regNumber = normalizeReg(req.params.regNumber);
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
  const { availabilitySummary } = require('../services/availability');
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
  const { facilityId, floorId, startTime, endTime, vehicleLabel } = req.body;
  if (!mongoose.isValidObjectId(facilityId)) throw httpError(400, 'Choose a facility');
  if (floorId && !mongoose.isValidObjectId(floorId)) throw httpError(400, 'Choose a valid floor');
  const regNumber = normalizeReg(req.body.regNumber);
  if (!isValidReg(regNumber)) throw httpError(400, 'Enter a valid vehicle number');

  const facility = await Facility.findOne({ _id: facilityId, isActive: true }).select('_id').lean();
  if (!facility) throw httpError(404, 'Facility not found or inactive');

  const { start, end } = parseWindow(startTime, endTime);

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
    vehicleLabel: vehicleLabel ? String(vehicleLabel).trim().slice(0, 30) : '',
  });
  res.status(201).json(reservation);
});

exports.cancelMine = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findOne({ _id: req.params.id, driver: req.user._id });
  if (!reservation) throw httpError(404, 'Booking not found');
  res.json(await cancelReservation(reservation));
});
