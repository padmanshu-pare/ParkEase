import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// One socket for the page. Facility rooms are joined and left as the list changes,
// so the connection is not recreated each time the list refreshes.
export default function useAvailabilityFeed(facilityIds, onUpdate) {
  const callback = useRef(onUpdate);
  callback.current = onUpdate;
  const socketRef = useRef(null);
  const joinedRef = useRef(new Set());
  const listKey = facilityIds.join(',');

  useEffect(() => {
    const socket = io(`${BASE}/public`, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    const handler = (payload) => callback.current && callback.current(payload);
    // After any (re)connect, rejoin every room we still want
    const rejoin = () => joinedRef.current.forEach((id) => socket.emit('facility:join', id));
    socket.on('connect', rejoin);
    socket.on('availability:update', handler);
    return () => {
      socket.off('connect', rejoin);
      socket.off('availability:update', handler);
      socket.disconnect();
      socketRef.current = null;
      joinedRef.current = new Set();
    };
  }, []);

  useEffect(() => {
    const want = new Set(facilityIds);
    const socket = socketRef.current;
    want.forEach((id) => {
      if (joinedRef.current.has(id)) return;
      joinedRef.current.add(id);
      if (socket && socket.connected) socket.emit('facility:join', id);
    });
    joinedRef.current.forEach((id) => {
      if (want.has(id)) return;
      joinedRef.current.delete(id);
      if (socket && socket.connected) socket.emit('facility:leave', id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);
}
