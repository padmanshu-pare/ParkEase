const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

// Phase 1: authenticated manager panel clients only. Events carry no private data - they just tell
// the client to refetch. (The public live-availability page in Phase 2 will use its own namespace.)
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
  return io;
};

exports.emitAvailability = (facilityId, floorId) => {
  if (io) io.to(`facility:${facilityId}`).emit('availability:update', { facilityId: String(facilityId), floorId: floorId ? String(floorId) : null });
};
