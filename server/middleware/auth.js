const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw httpError(401, 'Please log in to continue');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw httpError(401, 'Your session has expired. Please log in again.');
  }
  const user = await User.findById(payload.id);
  if (!user || !user.isActive) throw httpError(401, 'This account is not available');
  req.user = user;
  next();
});

exports.authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(httpError(403, 'You do not have permission for this action'));

// Staff = people who work inside the manager panel
exports.staff = exports.authorize('admin', 'manager');
exports.adminOnly = exports.authorize('admin');
