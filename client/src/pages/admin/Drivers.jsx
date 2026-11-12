import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { PageHeader, Spinner, Empty } from '../../components/common/ui';

const fmt = (d) => (d ? new Date(d).toLocaleDateString([], { dateStyle: 'medium' }) : '-');

export default function Drivers() {
  const [items, setItems] = useState(null);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    api.get('/users/drivers').then(({ data }) => setItems(data)).catch((e) => toast.error(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const toggle = async (d) => {
    const next = !d.isActive;
    if (!window.confirm(`${next ? 'Activate' : 'Deactivate'} ${d.name}?${next ? '' : ' They will be logged out from the next request.'}`)) return;
    setBusyId(d._id);
    try {
      await api.put(`/users/drivers/${d._id}`, { isActive: next });
      toast.success(next ? 'Driver activated' : 'Driver deactivated');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusyId('');
    }
  };

  return (
    <div>
      <PageHeader title="Drivers" subtitle="Everyone who signed up in the driver portal, with their booking activity." />
      {!items ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : !items.length ? (
        <div className="card"><Empty icon={Users} title="No drivers yet">Drivers appear here after they sign up.</Empty></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Vehicles</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Active now</th>
                <th className="px-4 py-3">Last booking</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((d) => (
                <tr key={d._id}>
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{d.email}{d.phone ? ` · ${d.phone}` : ''}</p></td>
                  <td className="px-4 py-3">{d.vehicleCount}</td>
                  <td className="px-4 py-3">{d.reservations}</td>
                  <td className="px-4 py-3">{d.activeReservations}</td>
                  <td className="px-4 py-3">{fmt(d.lastBooking)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${d.isActive ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>{d.isActive ? 'Active' : 'Deactivated'}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className={d.isActive ? 'btn-danger btn-sm' : 'btn-secondary btn-sm'} disabled={busyId === d._id} onClick={() => toggle(d)}>
                      {d.isActive ? 'Deactivate' : 'Activate'}
                    </button>
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
