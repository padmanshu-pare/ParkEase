const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Paths a demo session may still use for writes (so they can log in and out)
const OPEN_WRITE_PATHS = ['/api/auth/login'];

// Demo accounts can read everything in their sample facility but cannot change anything.
// Every write request that carries a demo token is refused here, before any route runs.
module.exports = async function demoGuard(req, res, next) {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();
  if (OPEN_WRITE_PATHS.includes(req.originalUrl.split('?')[0])) return next();
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('isDemo');
    if (user && user.isDemo) {
      return res.status(403).json({ message: 'Demo mode: changes are turned off. This is a read-only sample.' });
    }
  } catch {
    // invalid token: the normal auth middleware will reject the request
  }
  next();
};
