import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Clock, Car } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import useAvailabilityFeed from '../../hooks/useAvailabilityFeed';
import { PageHeader, Spinner, Empty } from '../../components/common/ui';

export default function DriverFacilities() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    api.get('/driver/facilities', { params: { q } })
      .then(({ data }) => setItems(data))
      .catch((e) => toast.error(errMsg(e)));
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useAvailabilityFeed((items || []).map((f) => f._id), load);

  return (
    <div>
      <PageHeader title="Find parking" subtitle="Live free slots at each facility. Pick one to book a time." />
      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Search by facility name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!items ? (
        <div className="grid place-items-center py-16"><Spinner /></div>
      ) : !items.length ? (
        <div className="card"><Empty title="No facilities found">Try a different search.</Empty></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((f) => (
            <div key={f._id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">{f.name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" />{f.address}{f.city ? `, ${f.city}` : ''}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><Clock className="h-3.5 w-3.5" />{f.openTime} to {f.closeTime}</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-extrabold ${f.free > 0 ? 'text-green-600' : 'text-red-600'}`}>{f.free}</p>
                  <p className="text-xs text-slate-500">of {f.total} free</p>
                </div>
              </div>
              <Link to={`/driver/book/${f._id}`} className="btn-primary mt-4 w-full"><Car className="h-4 w-4" />Book a slot</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
