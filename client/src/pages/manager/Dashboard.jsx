import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import useLiveAvailability from '../../hooks/useLiveAvailability';
import FloorMap from '../../components/parking/FloorMap';
import { PageHeader, Spinner, Badge, NoFacility, Empty } from '../../components/common/ui';
import { fmtDateTime } from '../../utils/format';

const Stat = ({ label, value, tone = 'text-slate-900', note }) => (
  <div className="card p-5">
    <p className="text-sm font-semibold text-slate-500">{label}</p>
    <p className={`mt-1 text-3xl font-extrabold tracking-tight ${tone}`}>{value}</p>
    {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
  </div>
);

export default function Dashboard() {
  const { selected, selectedId } = useFacility();
  const [data, setData] = useState(null);
  const [floorId, setFloorId] = useState('');
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!selectedId) return;
    api.get('/dashboard', { params: { facility: selectedId } })
      .then((r) => { setData(r.data); setError(''); setTick((t) => t + 1); setFloorId((cur) => (r.data.floors.some((f) => f._id === cur) ? cur : r.data.floors[0]?._id || '')); })
      .catch((e) => setError(errMsg(e)));
  }, [selectedId]);

  useEffect(() => { setData(null); load(); }, [load]);
  const live = useLiveAvailability(selectedId, load);

  if (!selectedId) return <NoFacility />;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <div className="grid place-items-center py-24"><Spinner /></div>;
  const { stats, floors, recentRecords, recentReservations } = data;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={selected?.name}>
        <span className={`mr-2 inline-flex items-center gap-1.5 text-xs font-semibold ${live ? 'text-green-600' : 'text-slate-400'}`}>
          <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-green-500' : 'bg-slate-300'}`} />{live ? 'Live' : 'Offline'}
        </span>
        <Link to="/entry" className="btn-primary"><LogIn className="h-4 w-4" />Vehicle entry</Link>
        <Link to="/exit" className="btn-secondary"><LogOut className="h-4 w-4" />Vehicle exit</Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total slots" value={stats.total} note={`${stats.reserved} reserved · ${stats.maintenance} in maintenance`} />
        <Stat label="Available" value={stats.available} tone="text-slot-available" />
        <Stat label="Occupied" value={stats.occupied} tone="text-slot-occupied" />
        <Stat label="Vehicles today" value={stats.vehiclesToday} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="card p-5 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-slate-900">Live floor plan</h2>
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {floors.map((f) => (
                <button key={f._id} onClick={() => setFloorId(f._id)} className={`rounded-md px-3 py-1 text-xs font-bold ${floorId === f._id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>{f.name}</button>
              ))}
            </div>
          </div>
          {floorId ? <FloorMap floorId={floorId} refreshKey={tick} /> : <Empty title="No floors yet">Ask your admin to add a floor to this facility.</Empty>}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-bold text-slate-900">Floor-wise availability</h2>
          <div className="space-y-4">
            {floors.map((f) => {
              const pct = f.stats.total ? Math.round((f.stats.available / f.stats.total) * 100) : 0;
              return (
                <div key={f._id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-slate-700">{f.name}</span>
                    <span className="text-slate-500"><b className="text-slate-900">{f.stats.available}</b> of {f.stats.total} free</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slot-available" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
            {!floors.length && <p className="text-sm text-slate-500">No floors added yet.</p>}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <h2 className="border-b border-slate-200 px-5 py-4 font-bold text-slate-900">Recently parked vehicles</h2>
          {recentRecords.length ? (
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {recentRecords.map((r) => (
                  <tr key={r._id}>
                    <td className="td"><span className="plate">{r.regNumber}</span></td>
                    <td className="td text-slate-500">{r.floor?.name} · {r.slot?.name}</td>
                    <td className="td text-slate-500">{fmtDateTime(r.entryTime)}</td>
                    <td className="td text-right"><Badge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty title="No vehicles yet">Entries you record will show up here.</Empty>}
        </section>

        <section className="card overflow-hidden">
          <h2 className="border-b border-slate-200 px-5 py-4 font-bold text-slate-900">Recent reservations</h2>
          {recentReservations.length ? (
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {recentReservations.map((r) => (
                  <tr key={r._id}>
                    <td className="td"><span className="plate">{r.regNumber || '—'}</span></td>
                    <td className="td text-slate-500">{r.floor?.name} · {r.slot?.name}</td>
                    <td className="td text-slate-500">{fmtDateTime(r.startTime)}</td>
                    <td className="td text-right"><Badge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty title="No reservations yet">Online bookings arrive with the Driver Portal in the next phase.</Empty>}
        </section>
      </div>
    </>
  );
}
