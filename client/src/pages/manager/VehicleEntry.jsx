import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CalendarCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import useLiveAvailability from '../../hooks/useLiveAvailability';
import PlateScanner from '../../components/vehicles/PlateScanner';
import FloorMap from '../../components/parking/FloorMap';
import { PageHeader, Field, NoFacility } from '../../components/common/ui';
import { normalizeReg, fmtDateTime } from '../../utils/format';

const EMPTY = { regNumber: '', ownerName: '', ownerPhone: '' };

export default function VehicleEntry() {
  const { selected, selectedId, reload } = useFacility();
  const [floors, setFloors] = useState([]);
  const [floorId, setFloorId] = useState('');
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [reservation, setReservation] = useState(null);
  const [linkRes, setLinkRes] = useState(false);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const loadFloors = useCallback(() => {
    if (!selectedId) return;
    api.get(`/facilities/${selectedId}/floors`).then((r) => {
      setFloors(r.data);
      setFloorId((cur) => (r.data.some((f) => f._id === cur) ? cur : r.data.find((f) => f.stats.total)?._id || r.data[0]?._id || ''));
    }).catch((e) => toast.error(errMsg(e)));
  }, [selectedId]);

  useEffect(() => { setSlot(null); loadFloors(); }, [loadFloors]);
  useLiveAvailability(selectedId, () => { loadFloors(); setTick((t) => t + 1); });

  // If someone else takes the picked slot, drop the selection
  useEffect(() => { setSlot((s) => (s && (s.floor?._id || s.floor) === floorId ? s : null)); }, [floorId]);

  // Look for a confirmed reservation for this vehicle
  const reg = normalizeReg(form.regNumber);
  useEffect(() => {
    setReservation(null); setLinkRes(false);
    if (reg.length < 5 || !selectedId) return undefined;
    const t = setTimeout(() => {
      api.get('/reservations/lookup', { params: { facility: selectedId, regNumber: reg } }).then((r) => setReservation(r.data.reservation)).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [reg, selectedId]);

  const toggleLink = () => {
    const next = !linkRes;
    setLinkRes(next);
    if (next && reservation) { setFloorId(reservation.floor._id); setSlot({ _id: reservation.slot._id, name: reservation.slot.name, status: 'reserved', floor: reservation.floor._id }); }
    else setSlot(null);
  };

  const pick = (s) => {
    if (s.status === 'reserved' && !(linkRes && reservation && s._id === reservation.slot._id)) return toast.error('This slot is reserved for another booking.');
    setSlot(s);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!slot) return toast.error('Select the slot where the vehicle is parked');
    setBusy(true);
    try {
      const { data } = await api.post('/records/entry', {
        facilityId: selectedId, floorId, slotId: slot._id, ...form, regNumber: reg, reservationId: linkRes ? reservation._id : undefined,
      });
      setDone(data); reload(); loadFloors(); setTick((t) => t + 1);
    } catch (err) {
      toast.error(errMsg(err));
      loadFloors(); setTick((t) => t + 1); setSlot(null);
    } finally { setBusy(false); }
  };

  const reset = () => { setDone(null); setForm(EMPTY); setSlot(null); };

  if (!selectedId) return <NoFacility />;

  if (done) {
    return (
      <div className="mx-auto max-w-md">
        <div className="card p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-slot-available" />
          <h1 className="mt-3 text-xl font-extrabold text-slate-900">Entry recorded</h1>
          <p className="mt-4"><span className="plate text-lg">{done.regNumber}</span></p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Parked at</dt><dd className="font-bold">{done.floor?.name} · {done.slot?.name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Entry time</dt><dd className="font-bold">{fmtDateTime(done.entryTime)}</dd></div>
          </dl>
          <div className="mt-6 flex gap-2">
            <button className="btn-primary flex-1" onClick={reset}>Record another</button>
            <Link to="/" className="btn-secondary flex-1">Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  const floor = floors.find((f) => f._id === floorId);

  return (
    <>
      <PageHeader title="Vehicle entry" subtitle={`${selected?.name}. Scan the plate, then tap the slot where the vehicle is parked.`} />
      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-3">
        <div className="card space-y-4 p-5 xl:col-span-1">
          <PlateScanner onDetected={(p) => setForm((f) => ({ ...f, regNumber: p }))} />
          <Field label="Vehicle number" hint="Check the detected number and correct it if needed.">
            <input className="input font-mono text-base font-bold uppercase tracking-wider" required value={form.regNumber} onChange={(e) => setForm({ ...form, regNumber: e.target.value.toUpperCase() })} placeholder="MP17AB1234" />
          </Field>
          <Field label="Owner name (optional)"><input className="input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></Field>
          <Field label="Contact number (optional)"><input className="input" inputMode="tel" value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} /></Field>

          {reservation && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
              <p className="flex items-center gap-2 font-bold text-blue-800"><CalendarCheck className="h-4 w-4" />Reservation found</p>
              <p className="mt-1 text-blue-700">{reservation.floor?.name} · {reservation.slot?.name}, from {fmtDateTime(reservation.startTime)}</p>
              <button type="button" className={`mt-2 btn-sm ${linkRes ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleLink}>{linkRes ? 'Unlink reservation' : 'Link to this entry'}</button>
            </div>
          )}

          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-xs font-semibold text-slate-500">Selected slot</p>
            <p className="font-bold text-slate-900">{slot ? `${floor?.name} · ${slot.name}` : 'None yet'}</p>
          </div>
          <button className="btn-primary w-full" disabled={busy || !slot || reg.length < 5}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Confirm entry</button>
        </div>

        <div className="card p-5 xl:col-span-2">
          <div className="mb-4 flex flex-wrap gap-2">
            {floors.map((f) => (
              <button type="button" key={f._id} onClick={() => setFloorId(f._id)} className={`rounded-lg border px-3 py-2 text-left text-sm ${floorId === f._id ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <span className="block font-bold text-slate-800">{f.name}</span>
                <span className="text-xs text-slate-500">{f.stats.available} of {f.stats.total} free</span>
              </button>
            ))}
          </div>
          {floorId && <FloorMap floorId={floorId} refreshKey={tick} onSlotClick={pick} selectedSlotId={slot?._id} selectableStatuses={linkRes ? ['available', 'reserved'] : ['available']} />}
        </div>
      </form>
    </>
  );
}
