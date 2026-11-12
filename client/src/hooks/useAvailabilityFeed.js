import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Joins the public socket room for each facility and calls onUpdate when counts change.
// The payload carries no private data, so the caller just refetches its numbers.
export default function useAvailabilityFeed(facilityIds, onUpdate) {
  const callback = useRef(onUpdate);
  callback.current = onUpdate;
  const key = facilityIds.join(',');

  useEffect(() => {
    if (!facilityIds.length) return undefined;
    const socket = io(`${BASE}/public`, { transports: ['websocket', 'polling'] });
    facilityIds.forEach((id) => socket.emit('facility:join', id));
    const handler = (payload) => callback.current && callback.current(payload);
    socket.on('availability:update', handler);
    return () => {
      socket.off('availability:update', handler);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
