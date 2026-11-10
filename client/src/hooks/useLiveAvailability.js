import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../services/socket';

// Calls onUpdate (debounced) whenever slots change in the given facility. Returns connection state.
export default function useLiveAvailability(facilityId, onUpdate) {
  const [live, setLive] = useState(false);
  const cb = useRef(onUpdate);
  cb.current = onUpdate;

  useEffect(() => {
    if (!facilityId) return undefined;
    const socket = getSocket();
    let timer;
    const join = () => { setLive(true); socket.emit('facility:join', facilityId); };
    const onUp = (e) => {
      if (e.facilityId !== facilityId) return;
      clearTimeout(timer);
      timer = setTimeout(() => cb.current && cb.current(e), 250);
    };
    if (socket.connected) join();
    socket.on('connect', join);
    socket.on('disconnect', () => setLive(false));
    socket.on('availability:update', onUp);
    return () => {
      clearTimeout(timer);
      socket.emit('facility:leave', facilityId);
      socket.off('connect', join);
      socket.off('availability:update', onUp);
    };
  }, [facilityId]);

  return live;
}
