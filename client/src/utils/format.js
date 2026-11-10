export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—');

export const fmtDuration = (mins) => {
  if (mins === undefined || mins === null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const normalizeReg = (v = '') => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
export const STATUS_LABEL = { available: 'Available', occupied: 'Occupied', reserved: 'Reserved', maintenance: 'Maintenance' };
