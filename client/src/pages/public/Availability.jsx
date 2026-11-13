import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ParkingSquare, Radio, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import useAvailabilityFeed from '../../hooks/useAvailabilityFeed';
import { Spinner } from '../../components/common/ui';
import ThemeToggle from '../../components/common/ThemeToggle';

export default function Availability() {
  const [items, setItems] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(() => {
    api.get('/public/facilities')
      .then(({ data }) => { setItems(data); setUpdatedAt(new Date()); })
      .catch((e) => toast.error(errMsg(e)));
  }, []);

  useEffect(() => { load(); }, [load]);
  useAvailabilityFeed((items || []).map((f) => f._id), load);

  return (
    <div className="min-h-full bg-slate-50">
      <header className="flex items-center justify-between bg-navy-900 px-6 py-4 text-white">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600"><ParkingSquare className="h-5 w-5" /></span>
          <span className="text-lg font-extrabold">ParkEase</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="text-white hover:bg-navy-800" />
          <Link to="/driver/login" className="btn-primary btn-sm">Book a slot</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Parking availability</h1>
            <p className="text-sm text-slate-500">Free slots, updated live.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            <Radio className="h-3.5 w-3.5" />Live{updatedAt ? ` · ${updatedAt.toLocaleTimeString()}` : ''}
          </span>
        </div>

        {!items ? (
          <div className="grid place-items-center py-24"><Spinner /></div>
        ) : !items.length ? (
          <p className="text-slate-500">No facilities are listed yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((f) => {
              const pct = f.total ? Math.round((f.free / f.total) * 100) : 0;
              return (
                <div key={f._id} className="card p-5">
                  <h2 className="font-bold text-slate-900">{f.name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" />{f.address}{f.city ? `, ${f.city}` : ''}</p>
                  <div className="mt-5 flex items-end justify-between">
                    <p className={`text-4xl font-extrabold ${f.free > 0 ? 'text-green-600' : 'text-red-600'}`}>{f.free}</p>
                    <p className="text-sm text-slate-500">of {f.total} slots free</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${pct > 30 ? 'bg-green-500' : pct > 0 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{f.occupied} occupied · {f.reserved} reserved</p>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-8 text-center text-xs text-slate-400">Counts only. No vehicle details are shown on this page.</p>
        <p className="mt-2 text-center text-xs text-slate-500">
          <Link to="/privacy" className="hover:underline">Privacy</Link> · <Link to="/terms" className="hover:underline">Terms</Link> · <Link to="/refund" className="hover:underline">Refunds</Link>
        </p>
      </main>
    </div>
  );
}
