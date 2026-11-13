const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { accessibleFacilityIds } = require('../services/access');

let io;
let publicNs;

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const JOIN_LIMIT = 30; // room joins per connection per minute

function withinJoinLimit(socket) {
  const now = Date.now();
  if (!socket.data.windowStart || now - socket.data.windowStart > 60 * 1000) {
    socket.data.windowStart = now;
    socket.data.joins = 0;
  }
  socket.data.joins += 1;
  return socket.data.joins <= JOIN_LIMIT;
}

// canJoin: optional async check (staff must have access to the facility)
function wireRooms(socket, canJoin) {
  socket.on('facility:join', async (id) => {
    if (typeof id !== 'string' || !OBJECT_ID.test(id) || !withinJoinLimit(socket)) return;
    if (canJoin && !(await canJoin(id))) return;
    socket.join(`facility:${id}`);
  });
  socket.on('facility:leave', (id) => {
    if (typeof id === 'string' && OBJECT_ID.test(id)) socket.leave(`facility:${id}`);
  });
}

// Two namespaces:
//  "/"        staff (manager panel). Needs a valid JWT of an active admin or manager.
//  "/public"  anyone. Only receives counts-changed signals, never vehicle or driver data.
exports.init = (httpServer) => {
  const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
  io = new Server(httpServer, { cors: { origin: origins } });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select('role isActive facilities');
      if (!user || !user.isActive || user.role === 'driver') return next(new Error('unauthorized'));
      socket.data.user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) =>
    wireRooms(socket, async (id) => (await accessibleFacilityIds(socket.data.user)).some((f) => String(f) === id))
  );

  publicNs = io.of('/public');
  publicNs.on('connection', (socket) => wireRooms(socket, null));

  return io;
};

exports.emitAvailability = (facilityId, floorId) => {
  const payload = { facilityId: String(facilityId), floorId: floorId ? String(floorId) : null };
  if (io) io.to(`facility:${facilityId}`).emit('availability:update', payload);
  if (publicNs) publicNs.to(`facility:${facilityId}`).emit('availability:update', payload);
};
