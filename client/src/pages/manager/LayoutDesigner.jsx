import { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Group, Transformer } from 'react-konva';
import toast from 'react-hot-toast';
import { Square, Minus, LogIn, LogOut, ArrowRight, Trash2, Copy, Save, Send, Tags, Import, Loader2 } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import { PageHeader, Field, Modal, Spinner, NoFacility, Empty } from '../../components/common/ui';
import { ElementBody, TYPE_STYLE } from '../../components/parking/ElementShapes';

const CANVAS = { width: 1000, height: 600 };
const GRID = 10;

const TOOLS = [
  { type: 'slot', label: 'Slot', icon: Square },
  { type: 'road', label: 'Road', icon: Minus },
  { type: 'entry', label: 'Entry gate', icon: LogIn },
  { type: 'exit', label: 'Exit gate', icon: LogOut },
  { type: 'arrow', label: 'Arrow', icon: ArrowRight },
];

const DEFAULTS = {
  slot: { width: 60, height: 40, label: '' },
  road: { width: 160, height: 30, label: '' },
  entry: { width: 90, height: 40, label: 'ENTRY' },
  exit: { width: 90, height: 40, label: 'EXIT' },
  arrow: { width: 80, height: 24, label: '' },
};

const uid = () => `el_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const snap = (v) => Math.round(v / GRID) * GRID;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// Next free slot name like S01, S02 ... (skips names already in use)
function nextSlotName(elements) {
  const used = new Set(elements.filter((e) => e.type === 'slot').map((e) => e.label.trim().toLowerCase()));
  let n = 1;
  while (used.has(`s${String(n).padStart(2, '0')}`)) n += 1;
  return `S${String(n).padStart(2, '0')}`;
}

export default function LayoutDesigner() {
  const { selectedId: facilityId, selected: facility } = useFacility() || {};
  const [floors, setFloors] = useState([]);
  const [floorId, setFloorId] = useState('');
  const [elements, setElements] = useState([]);
  const [selectedElId, setSelectedElId] = useState(null);
  const [status, setStatus] = useState('draft');
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const box = useRef(null);
  const [width, setWidth] = useState(800);
  const nodeRefs = useRef({});
  const trRef = useRef(null);

  // Keep canvas sized to its container
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  // Load floors for the selected facility
  useEffect(() => {
    if (!facilityId) return;
    setFloors([]);
    setFloorId('');
    api.get(`/facilities/${facilityId}/floors`)
      .then(({ data }) => {
        setFloors(data);
        setFloorId((cur) => (data.some((f) => f._id === cur) ? cur : data[0]?._id || ''));
      })
      .catch((e) => toast.error(errMsg(e)));
  }, [facilityId]);

  // Load layout for the selected floor
  useEffect(() => {
    if (!floorId) return;
    setLoading(true);
    api.get(`/layouts/${floorId}`)
      .then(({ data }) => {
        setElements(data.elements || []);
        setStatus(data.status || 'draft');
        setDirty(false);
        setSelectedElId(null);
      })
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false));
  }, [floorId]);

  // Attach transformer to the selected element
  useEffect(() => {
    const node = selectedElId ? nodeRefs.current[selectedElId] : null;
    if (trRef.current) {
      trRef.current.nodes(node ? [node] : []);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedElId, elements]);

  // Delete / duplicate shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElId) removeSelected();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedElId) {
        e.preventDefault();
        duplicateSelected();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const commit = (updater) => {
    setElements((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    setDirty(true);
  };

  const scale = Math.max(0.3, width / CANVAS.width);
  const selectedEl = elements.find((e) => e.id === selectedElId) || null;

  const slotCount = useMemo(() => elements.filter((e) => e.type === 'slot').length, [elements]);

  const addElement = (type) => {
    const d = DEFAULTS[type];
    const el = {
      id: uid(),
      type,
      x: snap(CANVAS.width / 2 - d.width / 2 + (elements.length % 5) * 20),
      y: snap(CANVAS.height / 2 - d.height / 2 + (elements.length % 5) * 20),
      width: d.width,
      height: d.height,
      rotation: 0,
      label: type === 'slot' ? nextSlotName(elements) : d.label,
    };
    commit((prev) => [...prev, el]);
    setSelectedElId(el.id);
  };

  const updateEl = (id, patch) => commit((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const removeSelected = () => {
    if (!selectedElId) return;
    commit((prev) => prev.filter((e) => e.id !== selectedElId));
    setSelectedElId(null);
  };

  const duplicateSelected = () => {
    if (!selectedEl) return;
    const copy = { ...selectedEl, id: uid(), x: selectedEl.x + 20, y: selectedEl.y + 20 };
    if (copy.type === 'slot') copy.label = nextSlotName(elements);
    if (copy.type === 'entry' || copy.type === 'exit') copy.label = selectedEl.label;
    commit((prev) => [...prev, copy]);
    setSelectedElId(copy.id);
  };

  const applyBulkNames = (prefix, start, pad) => {
    const slots = elements
      .filter((e) => e.type === 'slot')
      .sort((a, b) => (Math.round(a.y / 40) - Math.round(b.y / 40)) || a.x - b.x); // rows top to bottom, left to right
    const ids = new Set(slots.map((s) => s.id));
    const map = {};
    slots.forEach((s, i) => {
      map[s.id] = `${prefix}${String(Number(start) + i).padStart(pad, '0')}`;
    });
    const names = Object.values(map).map((n) => n.toLowerCase());
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) return toast.error('Naam duplicate ho rahe hain, prefix ya start badlo');
    commit((prev) => prev.map((e) => (ids.has(e.id) ? { ...e, label: map[e.id] } : e)));
    setBulkOpen(false);
    toast.success(`${slots.length} slots ka naam set ho gaya`);
  };

  const confirmLeave = () => !dirty || window.confirm('Aapke changes save nahi hue hain. Floor badalne se ye chale jayenge. Continue?');

  const saveDraft = async () => {
    setBusy('save');
    try {
      const { data } = await api.put(`/layouts/${floorId}`, { elements });
      setStatus(data.status);
      setDirty(false);
      toast.success('Draft save ho gaya');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  const publish = async () => {
    const slotNames = elements.filter((e) => e.type === 'slot').map((e) => e.label.trim());
    if (!slotNames.length) return toast.error('Publish se pehle kam se kam ek slot banao');
    if (slotNames.some((n) => !n)) return toast.error('Har slot ka naam hona chahiye (jaise A01)');
    if (!window.confirm(`Publish karne par ${slotNames.length} parking slots ban (ya update ho) jayenge. Continue?`)) return;
    setBusy('publish');
    try {
      const { data } = await api.post(`/layouts/${floorId}/publish`, { elements });
      setStatus(data.status);
      setDirty(false);
      toast.success(`Published. ${slotNames.length} slots sync ho gaye`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  const copyFrom = async (sourceFloorId) => {
    setBusy('copy');
    try {
      const { data } = await api.post(`/layouts/${floorId}/copy`, { sourceFloorId });
      setElements(data.elements);
      setDirty(true);
      setSelectedElId(null);
      setCopyOpen(false);
      toast.success(`${data.copiedFrom} se layout copy ho gaya. Ab save/publish karo`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  if (!facilityId) return <NoFacility />;

  const otherFloors = floors.filter((f) => f._id !== floorId);

  return (
    <div>
      <PageHeader title="Layout designer" subtitle={`${facility?.name || ''} · Draft save karo, jab tayyar ho tab Publish karo`}>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${status === 'published' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'}`}>
          {status === 'published' ? 'Published' : 'Draft'}{dirty ? ' · unsaved' : ''}
        </span>
        <select className="input w-auto" value={floorId} onChange={(e) => { if (confirmLeave()) setFloorId(e.target.value); }}>
          {floors.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
        </select>
        <button className="btn-secondary" disabled={!floorId || busy} onClick={() => setCopyOpen(true)}><Import className="h-4 w-4" />Copy from floor</button>
        <button className="btn-secondary" disabled={!floorId || busy} onClick={saveDraft}>
          {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save draft
        </button>
        <button className="btn-primary" disabled={!floorId || busy} onClick={publish}>
          {busy === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Publish
        </button>
      </PageHeader>

      {!floors.length && facilityId ? (
        <div className="card"><Empty title="Is facility me koi floor nahi hai">Admin se floor banwao, phir yahan design karo.</Empty></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[170px_minmax(0,1fr)_250px]">
          {/* Tools */}
          <div className="card min-w-0 space-y-2 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Add</p>
            {TOOLS.map(({ type, label, icon: Icon }) => (
              <button key={type} className="btn-secondary w-full justify-start gap-2 px-3 text-sm" disabled={!floorId} onClick={() => addElement(type)}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
            <p className="pt-2 text-xs text-slate-400">Tip: element pe click karke select karo, drag karke move karo, corner se resize aur upar wale handle se rotate karo. Delete key se hatao, Ctrl+D se duplicate.</p>
          </div>

          {/* Canvas */}
          <div ref={box} className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: `${GRID * scale}px ${GRID * scale}px` }}>
            {loading ? (
              <div className="grid h-64 place-items-center"><Spinner /></div>
            ) : (
              <Stage
                width={width}
                height={CANVAS.height * scale}
                scaleX={scale}
                scaleY={scale}
                onMouseDown={(e) => { if (e.target === e.target.getStage()) setSelectedElId(null); }}
                onTouchStart={(e) => { if (e.target === e.target.getStage()) setSelectedElId(null); }}
              >
                <Layer>
                  {elements.map((el) => (
                    <Group
                      key={el.id}
                      ref={(node) => { if (node) nodeRefs.current[el.id] = node; else delete nodeRefs.current[el.id]; }}
                      x={el.x}
                      y={el.y}
                      rotation={el.rotation || 0}
                      draggable
                      onClick={(e) => { e.cancelBubble = true; setSelectedElId(el.id); }}
                      onTap={(e) => { e.cancelBubble = true; setSelectedElId(el.id); }}
                      onDragEnd={(e) => {
                        updateEl(el.id, {
                          x: clamp(snap(e.target.x()), 0, CANVAS.width - el.width),
                          y: clamp(snap(e.target.y()), 0, CANVAS.height - el.height),
                        });
                      }}
                      onTransformEnd={(e) => {
                        const node = e.target;
                        const w = Math.max(10, el.width * node.scaleX());
                        const h = Math.max(10, el.height * node.scaleY());
                        node.scaleX(1);
                        node.scaleY(1);
                        updateEl(el.id, { x: snap(node.x()), y: snap(node.y()), width: snap(w) || 10, height: snap(h) || 10, rotation: Math.round(node.rotation()) });
                      }}
                    >
                      <ElementBody el={el} style={el.type === 'slot' ? TYPE_STYLE.slot : undefined} />
                    </Group>
                  ))}
                  <Transformer
                    ref={trRef}
                    rotateEnabled
                    keepRatio={false}
                    anchorSize={9}
                    borderStroke="#2563eb"
                    anchorStroke="#2563eb"
                    boundBoxFunc={(oldB, newB) => (newB.width < 10 || newB.height < 10 ? oldB : newB)}
                  />
                </Layer>
              </Stage>
            )}
          </div>

          {/* Properties */}
          <div className="card space-y-4 p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">Properties</p>
              <span className="text-xs text-slate-500">{slotCount} slots</span>
            </div>

            {selectedEl ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{selectedEl.type}</p>
                <Field label={selectedEl.type === 'slot' ? 'Slot name' : 'Label'} hint={selectedEl.type === 'slot' ? 'Jaise A01. Publish ke baad yahi naam slot pe dikhega.' : undefined}>
                  <input className="input" value={selectedEl.label} maxLength={20} onChange={(e) => updateEl(selectedEl.id, { label: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Width"><input className="input" type="number" min="10" value={selectedEl.width} onChange={(e) => updateEl(selectedEl.id, { width: Math.max(10, Number(e.target.value) || 10) })} /></Field>
                  <Field label="Height"><input className="input" type="number" min="10" value={selectedEl.height} onChange={(e) => updateEl(selectedEl.id, { height: Math.max(10, Number(e.target.value) || 10) })} /></Field>
                  <Field label="Rotation"><input className="input" type="number" value={selectedEl.rotation || 0} onChange={(e) => updateEl(selectedEl.id, { rotation: Number(e.target.value) || 0 })} /></Field>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1" onClick={duplicateSelected}><Copy className="h-4 w-4" />Duplicate</button>
                  <button className="btn-danger flex-1" onClick={removeSelected}><Trash2 className="h-4 w-4" />Delete</button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Canvas par koi element select karo.</p>
            )}

            <div className="border-t border-slate-200 pt-4">
              <button className="btn-secondary w-full" disabled={!slotCount} onClick={() => setBulkOpen(true)}><Tags className="h-4 w-4" />Bulk name slots</button>
            </div>
          </div>
        </div>
      )}

      <BulkNameModal open={bulkOpen} onClose={() => setBulkOpen(false)} onApply={applyBulkNames} />

      <Modal open={copyOpen} onClose={() => setCopyOpen(false)} title="Copy layout from another floor">
        {otherFloors.length ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Is floor ka current draft replace ho jayega. Copy ke baad Save draft ya Publish karna na bhoolo.</p>
            {otherFloors.map((f) => (
              <button key={f._id} className="btn-secondary w-full justify-between" disabled={!!busy} onClick={() => copyFrom(f._id)}>
                <span>{f.name}</span><span className="text-xs text-slate-400">{f.layoutStatus === 'none' ? 'no layout' : f.layoutStatus}</span>
              </button>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">Copy karne ke liye facility me dusra floor nahi hai.</p>}
      </Modal>
    </div>
  );
}

function BulkNameModal({ open, onClose, onApply }) {
  const [prefix, setPrefix] = useState('A');
  const [start, setStart] = useState(1);
  const [pad, setPad] = useState(2);
  return (
    <Modal open={open} onClose={onClose} title="Bulk name slots">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Selected nahi, sabhi slots ko naam milega. Order: upar wali row se neeche, left se right.</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Prefix"><input className="input" value={prefix} maxLength={5} onChange={(e) => setPrefix(e.target.value)} /></Field>
          <Field label="Start"><input className="input" type="number" min="0" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Digits"><input className="input" type="number" min="1" max="4" value={pad} onChange={(e) => setPad(Number(e.target.value) || 2)} /></Field>
        </div>
        <p className="text-sm text-slate-600">Example: {prefix}{String(Number(start)).padStart(pad, '0')}, {prefix}{String(Number(start) + 1).padStart(pad, '0')}, ...</p>
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onApply(prefix.trim(), start, pad)}>Apply</button>
        </div>
      </div>
    </Modal>
  );
}
