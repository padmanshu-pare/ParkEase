const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

// Turns a request into a readable action. Only successful writes (status below 400) are recorded.
const RULES = [
  { re: /^POST \/api\/records\/entry$/, action: 'vehicle.entry', label: 'Vehicle entry' },
  { re: /^POST \/api\/records\/[a-f0-9]{24}\/exit$/, action: 'vehicle.exit', label: 'Vehicle exit and checkout' },
  { re: /^POST \/api\/ops\/undo\//, action: 'ops.undo', label: 'Undo entry or exit' },
  { re: /^PUT \/api\/pricing/, action: 'pricing.update', label: 'Parking rate changed' },
  { re: /^POST \/api\/driver\/reservations\/[a-f0-9]{24}\/cancel$/, action: 'booking.cancel', label: 'Booking cancelled (refund if paid)' },
  { re: /^POST \/api\/driver\/reservations\/[a-f0-9]{24}\/pay$/, action: 'booking.pay', label: 'Booking payment' },
  { re: /^POST \/api\/layouts\/[a-f0-9]{24}\/publish$/, action: 'layout.publish', label: 'Layout published' },
  { re: /^PUT \/api\/slots/, action: 'slot.status', label: 'Slot status changed' },
  { re: /^PUT \/api\/users\/drivers/, action: 'driver.status', label: 'Driver activated or deactivated' },
  { re: /^POST \/api\/auth\/login$/, action: 'auth.login', label: 'Logged in' },
];

function pickFacility(req, body) {
  const candidates = [req.body && req.body.facilityId, req.query && req.query.facility, body && body.record && body.record.facility, body && body.facility];
  for (const c of candidates) {
    const id = c && typeof c === 'object' ? c._id : c;
    if (id && mongoose.isValidObjectId(String(id))) return String(id);
  }
  return null;
}

module.exports = function audit(req, res, next) {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();

  // Keep a copy of the JSON reply, so the facility and amount can be read from it
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res.locals.auditBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const path = req.originalUrl.split('?')[0];
    const full = `${req.method} ${path}`;
    const rule = RULES.find((r) => r.re.test(full)) || { action: full, label: full };
    const body = res.locals.auditBody || {};
    const u = req.user;
    const email = u ? u.email : typeof (req.body && req.body.email) === 'string' ? req.body.email.toLowerCase().slice(0, 254) : '';

    AuditLog.create({
      actor: u ? u._id : undefined,
      actorName: u ? u.name : '',
      actorEmail: email,
      actorRole: u ? u.role : '',
      facility: pickFacility(req, body),
      action: rule.action,
      label: rule.label,
      method: req.method,
      path,
      status: res.statusCode,
      details: {
        regNumber: body.regNumber || (body.record && body.record.regNumber) || (req.body && req.body.regNumber) || '',
        amount: typeof body.amount === 'number' ? body.amount : undefined,
      },
    }).catch((err) => console.error('[audit] could not save entry:', err.message));
  });
  next();
};
