import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Map as MapIcon, LayoutGrid } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import useLiveAvailability from '../../hooks/useLiveAvailability';
import FloorMap from '../../components/parking/FloorMap';
import { PageHeader, Modal, Badge, SlotLegend, NoFacility, Empty } from '../../components/common/ui';
import { fmtDateTime, STATUS_LABEL } from '../../utils/format';

const TILE = {
  available: 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100',
  occupied: 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100',
  reserved: 'border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100',
  maintenance: 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200',
};

export default function Slots() {
  const { selectedId } = useFacility();
  const [slots, setSlots] = useState([]);
  const [floors, setFloors] = useState([]);
  const [floorId, setFloorId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [active, setActive] = useState(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(() => {
    if (!selectedId) return;
    api.get('/slots', { params: { facility: selectedId } }).then((r) => { setSlots(r.data); setTick((t) => t + 1); }).catch((e) => toast.error(errMsg(e)));
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setFloorId('');
    api.get(`/facilities/${selectedId}/floors`).then((r) => setFloors(r.data));
    load();
  }, [selectedId, load]);
  useLiveAvailability(selectedId, load);

  const shown = useMemo(() => slots.filter((s) =>
    (!floorId || s.floor?._id === floorId) && (!status || s.status === status) && (!search || s.name.toLowerCase().includes(search.toLowerCase()))
  ), [slots, floorId, status, search]);

  const grouped = useMemo(() => {
    const g = {};
    shown.forEach((s) => { (g[s.floor?.name] = g[s.floor?.name] || []).push(s); });
    return Object.entries(g);
  }, [shown]);

  const setSlotStatus = async (slot, next) => {
    try {
      await api.patch(`/slots/${slot._id}/status`, { status: next });
      toast.success(`${slot.name} is now ${STATUS_LABEL[next].toLowerCase()}`);
      setActive(null); load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  if (!selectedId) return <NoFacility />;

  return (
    <>
      <PageHeader title="Parking slots" subtitle="Tap a slot to see details or change its status.">
        <div className="flex rounded-lg bg-slate-100 p-1">
          <button onClick={() => setView('grid')} className={`rounded-md px-3 py-1.5 text-xs font-bold ${view === 'grid' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}><LayoutGrid className="mr-1 inline h-3.5 w-3.5" />Grid</button>
          <button onClick={() => { setView('map'); if (!floorId && floors[0]) setFloorId(floors[0]._id); }} className={`rounded-md px-3 py-1.5 text-xs font-bold ${view === 'map' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}><MapIcon className="mr-1 inline h-3.5 w-3.5" />Map</button>
        </div>
      </PageHeader>

      <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search slot, e.g. A05" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search slots" />
        </div>
        <select className="input !w-auto" value={floorId} onChange={(e) => setFloorId(e.target.value)} aria-label="Floor">
          {view === 'grid' && <option value="">All floors</option>}
          {floors.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
        </select>
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <SlotLegend />
      </div>

      {view === 'map' ? (
        <div className="card p-5">
          {floorId ? <FloorMap floorId={floorId} refreshKey={tick} onSlotClick={(s) => setActive(slots.find((x) => x._id === s._id) || s)} selectableStatuses={['available', 'occupied', 'reserved', 'maintenance']} legend={false} /> : <Empty title="Choose a floor" />}
        </div>
      ) : grouped.length ? (
        grouped.map(([floor, list]) => (
          <section key={floor} className="card mb-5 p-5">
            <h2 className="mb-3 font-bold text-slate-900">{floor} <span className="ml-1 text-sm font-medium text-slate-400">{list.length} slots</span></h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8 xl:grid-cols-10">
              {list.map((s) => (
                <button key={s._id} onClick={() => setActive(s)} className={`rounded-lg border-2 px-2 py-3 text-center text-sm font-extrabold transition-colors ${TILE[s.status]}`}>
                  {s.name}
                  {s.currentRecord && <span className="mt-0.5 block truncate font-mono text-[10px] font-bold opacity-80">{s.currentRecord.regNumber}</span>}
                </button>
              ))}
            </div>
          </section>
        ))
      ) : <div className="card"><Empty title="No slots found">Slots are created when you publish a floor layout in the Layout designer.</Empty></div>}

      <Modal open={Boolean(active)} onClose={() => setActive(null)} title={active ? `Slot ${active.name}` : ''}>
        {active && (
          <div className="space-y-4">
            <div className="flex items-center justify-between"><span className="text-sm text-slate-500">{active.floor?.name}</span><Badge status={active.status} /></div>
            {active.currentRecord && (
              <div className="rounded-lg bg-slate-50 p-4 text-sm">
                <span className="plate">{active.currentRecord.regNumber}</span>
                <p className="mt-2 text-slate-500">Parked since {fmtDateTime(active.currentRecord.entryTime)}</p>
                {active.currentRecord.ownerName && <p className="text-slate-500">{active.currentRecord.ownerName} {active.currentRecord.ownerPhone}</p>}
              </div>
            )}
            {active.status === 'occupied' ? (
              <p className="text-sm text-slate-500">This slot is occupied. It becomes available automatically when the vehicle exits.</p>
            ) : (
              <div>
                <span className="label">Change status</span>
                <div className="grid grid-cols-3 gap-2">
                  {['available', 'reserved', 'maintenance'].map((s) => (
                    <button key={s} disabled={active.status === s} onClick={() => setSlotStatus(active, s)} className={`rounded-lg border px-2 py-2 text-xs font-bold capitalize disabled:opacity-40 ${TILE[s]}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
