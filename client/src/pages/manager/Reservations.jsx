import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, Info } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useFacility } from '../../context/FacilityContext';
import { PageHeader, Spinner, Empty, NoFacility } from '../../components/common/ui';

const STATUS = {
  confirmed: 'bg-green-50 text-green-700 ring-green-600/20',
  active: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  completed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
  expired: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  pending_payment: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};
const pad = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const hm = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Reservations() {
  const { selectedId } = useFacility() || {};
  const [date, setDate] = useState(today());
  const [items, setItems] = useState(null);

  const load = useCallback(() => {
    if (!selectedId) return;
    api.get('/reservations', { params: { facility: selectedId, date } })
      .then(({ data }) => setItems(data))
      .catch((e) => toast.error(errMsg(e)));
  }, [selectedId, date]);

  useEffect(() => { setItems(null); load(); }, [load]);

  // Refresh when any slot or booking changes
  useEffect(() => {
    const socket = getSocket();
    socket.on('availability:update', load);
    return () => socket.off('availability:update', load);
  }, [load]);

  if (!selectedId) return <NoFacility />;

  return (
    <div>
      <PageHeader title="Reservations" subtitle="Bookings for the selected day. Vehicle entry links a booking automatically when the plate matches.">
        <input type="date" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
      </PageHeader>

      <div className="mb-4 flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>When a booked vehicle arrives, enter its number in Vehicle entry. The system reserves that slot for the driver and marks it occupied once parked.</p>
      </div>

      {!items ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : !items.length ? (
        <div className="card"><Empty icon={CalendarDays} title="No bookings for this day" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Slot</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((r) => (
                <tr key={r._id}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{hm(r.startTime)} – {hm(r.endTime)}</td>
                  <td className="px-4 py-3 font-mono">{r.regNumber}</td>
                  <td className="px-4 py-3">{r.driver?.name || r.contactName || '-'}<div className="text-xs text-slate-500">{r.driver?.phone || r.contactPhone || ''}</div></td>
                  <td className="px-4 py-3">{r.slot?.name || '-'}<div className="text-xs text-slate-500">{r.floor?.name || ''}</div></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${STATUS[r.status] || ''}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
