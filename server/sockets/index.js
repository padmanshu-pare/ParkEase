const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
let publicNs;

// Two namespaces:
//  "/"        -> staff (manager panel), needs a valid JWT
//  "/public"  -> anyone, used by the public availability page
// Events carry no private data. They only tell clients to refetch.
exports.init = (httpServer) => {
  const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
  io = new Server(httpServer, { cors: { origin: origins } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('facility:join', (id) => typeof id === 'string' && socket.join(`facility:${id}`));
    socket.on('facility:leave', (id) => typeof id === 'string' && socket.leave(`facility:${id}`));
  });

  publicNs = io.of('/public');
  publicNs.on('connection', (socket) => {
    socket.on('facility:join', (id) => typeof id === 'string' && socket.join(`facility:${id}`));
    socket.on('facility:leave', (id) => typeof id === 'string' && socket.leave(`facility:${id}`));
  });

  return io;
};

exports.emitAvailability = (facilityId, floorId) => {
  const payload = { facilityId: String(facilityId), floorId: floorId ? String(floorId) : null };
  if (io) io.to(`facility:${facilityId}`).emit('availability:update', payload);
  if (publicNs) publicNs.to(`facility:${facilityId}`).emit('availability:update', payload);
};
