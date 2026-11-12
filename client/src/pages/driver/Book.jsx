import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { PageHeader, Spinner } from '../../components/common/ui';

const pad = (n) => String(n).padStart(2, '0');
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TIMES = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);
const DURATIONS = [
  { v: '0.5', label: '30 minutes' }, { v: '1', label: '1 hour' }, { v: '1.5', label: '1.5 hours' },
  { v: '2', label: '2 hours' }, { v: '3', label: '3 hours' }, { v: '4', label: '4 hours' },
  { v: '6', label: '6 hours' }, { v: '8', label: '8 hours' }, { v: '12', label: '12 hours' },
];

function nextHalfHour() {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Book() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ date: dateStr(new Date()), time: nextHalfHour(), hours: '1', floorId: '', regNumber: '', label: '' });

  useEffect(() => {
    api.get(`/driver/facilities/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((e) => toast.error(errMsg(e)));
    api.get('/driver/me')
      .then(({ data: d }) => {
        setVehicles(d.user.vehicles);
        if (d.user.vehicles[0]) setForm((f) => ({ ...f, regNumber: d.user.vehicles[0].regNumber, label: d.user.vehicles[0].label }));
      })
      .catch(() => {});
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const fee = Number(data?.rule?.reservationFee) || 0;

  const endPreview = useMemo(() => {
    const start = new Date(`${form.date}T${form.time}:00`);
    if (isNaN(start)) return '';
    const end = new Date(start.getTime() + Number(form.hours) * 3600000);
    return `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  }, [form.date, form.time, form.hours]);

  const submit = async (e) => {
    e.preventDefault();
    const start = new Date(`${form.date}T${form.time}:00`);
    if (start <= new Date()) return toast.error('Choose a time in the future');
    const end = new Date(start.getTime() + Number(form.hours) * 3600000);
    setBusy(true);
    try {
      await api.post('/driver/reservations', {
        facilityId: id,
        floorId: form.floorId || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        regNumber: form.regNumber,
        vehicleLabel: form.label,
      });
      toast.success('Slot booked');
      navigate('/driver/bookings');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="grid place-items-center py-24"><Spinner /></div>;

  return (
    <div>
      <Link to="/driver" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />All facilities</Link>
      <PageHeader title={data.facility.name} subtitle={`${data.facility.address}${data.facility.city ? `, ${data.facility.city}` : ''}`} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submit} className="card space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="date">Date</label>
              <input id="date" type="date" className="input" min={dateStr(new Date())} value={form.date} onChange={set('date')} required />
            </div>
            <div>
              <label className="label" htmlFor="time">Start time</label>
              <select id="time" className="input" value={form.time} onChange={set('time')}>
                {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="hours">Duration</label>
              <select id="hours" className="input" value={form.hours} onChange={set('hours')}>
                {DURATIONS.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="floor">Floor</label>
              <select id="floor" className="input" value={form.floorId} onChange={set('floorId')}>
                <option value="">Any floor</option>
                {data.summary.floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="reg">Vehicle number</label>
              <input id="reg" list="saved" className="input uppercase" required placeholder="MP17AB1234" value={form.regNumber} onChange={set('regNumber')} />
              <datalist id="saved">{vehicles.map((v) => <option key={v.regNumber} value={v.regNumber}>{v.label}</option>)}</datalist>
            </div>
            <div>
              <label className="label" htmlFor="label">Label (optional)</label>
              <input id="label" className="input" placeholder="My car" value={form.label} onChange={set('label')} />
            </div>
          </div>

          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Booking from <strong>{form.time}</strong> to <strong>{endPreview}</strong> on {form.date}. A free slot is assigned for the whole time.
          </p>

          <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Confirm booking</button>
        </form>

        <div className="card h-fit space-y-4 p-6">
          <h2 className="font-bold text-slate-900">Availability right now</h2>
          <p className="text-3xl font-extrabold text-green-600">{data.summary.free} <span className="text-base font-semibold text-slate-500">of {data.summary.total} free</span></p>
          <div className="space-y-2">
            {data.summary.floors.map((f) => (
              <div key={f.id} className="flex justify-between text-sm">
                <span className="text-slate-600">{f.name}</span>
                <span className="font-semibold text-slate-900">{f.free} free</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 pt-4 text-sm text-slate-600">
            <p>Booking fee: <strong>{fee > 0 ? `₹${fee}` : 'Free'}</strong></p>
            <p className="mt-2">You can cancel a booking up to 1 hour before it starts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
