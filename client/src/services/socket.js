import { io } from 'socket.io-client';
import { TOKEN_KEY } from './api';

let socket;
export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: (cb) => cb({ token: localStorage.getItem(TOKEN_KEY) }),
    });
  }
  return socket;
}
export function closeSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
