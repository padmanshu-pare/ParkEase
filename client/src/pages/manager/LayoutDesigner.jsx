import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Group, Transformer } from 'react-konva';
import { Car, Route, DoorOpen, DoorClosed, MoveRight, Copy, Trash2, Save, UploadCloud, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import { ElementBody } from '../../components/parking/ElementShapes';
import { PageHeader, Spinner, Field, NoFacility, Badge } from '../../components/common/ui';

const CANVAS = { width: 1000, height: 600 };
const GRID = 10;
const SIZE = { slot: [70, 110], road: [300, 80], entry: [110, 40], exit: [110, 40], arrow: [100, 36] };
const uid = () => `el_${Math.random().toString(36).slice(2, 9)}`;
const snap = (n) => Math.round(n / GRID) * GRID;
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

export default function LayoutDesigner() {
  const { selectedId, reload } = useFacility();
  const [floors, setFloors] = useState([]);
  const [floorId, setFloorId] = useState('');
  const [elements, setElements] = useState([]);
  const [selId, setSelId] = useState(null);
  const [status, setStatus] = useState('draft');
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [prefix, setPrefix] = useState('A');
  const [count, setCount] = useState(5);
  const [boxW, setBoxW] = useState(900);
  const box = useRef(null);
  const stageRef = useRef(null);
  const trRef = useRef(null);

  const scale = Math.max(0.5, boxW / CANVAS.width);
  const selected = elements.find((e) => e.id === selId);

  // floors for facility
  useEffect(() => {
    if (!selectedId) return;
    setFloors([]); setFloorId('');
    api.get(`/facilities/${selectedId}/floors`).then((r) => { setFloors(r.data); setFloorId(r.data[0]?._id || ''); }).catch((e) => toast.error(errMsg(e)));
  }, [selectedId]);

  // layout for floor
  useEffect(() => {
    if (!floorId) { setElements([]); return; }
    setLoading(true); setSelId(null);
    api.get(`/layouts/${floorId}`).then((r) => { setElements(r.data.elements || []); setStatus(r.data.status); setDirty(false); })
      .catch((e) => toast.error(errMsg(e))).finally(() => setLoading(false));
  }, [floorId]);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [loading]);

  // attach transformer to the selected node
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selId && stageRef.current ? stageRef.current.findOne(`#${selId}`) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selId, elements, loading]);

  // warn before leaving with unsaved work
  useEffect(() => {
    const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const change = useCallback((fn) => { setElements(fn); setDirty(true); }, []);
  const update = (id, patch) => change((els) => els.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const remove = useCallback(() => { if (selId) { change((els) => els.filter((e) => e.id !== selId)); setSelId(null); } }, [selId, change]);
  const duplicate = useCallback(() => {
    if (!selected) return;
    const copy = { ...selected, id: uid(), x: clamp(selected.x + 20, 0, CANVAS.width - 20), y: clamp(selected.y + 20, 0, CANVAS.height - 20), label: selected.type === 'slot' ? '' : selected.label };
    change((els) => [...els, copy]); setSelId(copy.id);
    if (selected.type === 'slot') toast('Duplicated slot has no name yet. Give it one before publishing.', { icon: '✏️' });
  }, [selected, change]);

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [remove, duplicate]);

  const addShape = (type) => {
    const [width, height] = SIZE[type];
    const n = elements.filter((e) => e.type === type).length;
    const el = { id: uid(), type, x: 60 + (n % 10) * 20, y: 60 + (n % 10) * 20, width, height, rotation: 0, label: type === 'entry' ? 'ENTRY' : type === 'exit' ? 'EXIT' : '' };
    change((els) => [...els, el]); setSelId(el.id);
  };

  const addSlots = (override) => {
    const p = prefix.trim().toUpperCase();
    const n = clamp(parseInt(override ?? count, 10) || 1, 1, 60);
    if (!p) return toast.error('Enter a slot prefix, for example A');
    const re = new RegExp(`^${p}(\\d+)$`, 'i');
    let next = Math.max(0, ...elements.filter((e) => e.type === 'slot').map((e) => (re.exec(e.label || '') ? parseInt(re.exec(e.label)[1], 10) : 0))) + 1;
    const bottom = elements.length ? Math.max(...elements.map((e) => e.y + e.height)) : 0;
    let x = 40;
    let y = elements.length ? clamp(snap(bottom + 20), 20, CANVAS.height - 130) : 80;
    const made = [];
    for (let i = 0; i < n; i++) {
      if (x + 70 > CANVAS.width - 20) { x = 40; y = Math.min(y + 130, CANVAS.height - 120); }
      made.push({ id: uid(), type: 'slot', x, y, width: 70, height: 110, rotation: 0, label: `${p}${String(next++).padStart(2, '0')}` });
      x += 80;
    }
    change((els) => [...els, ...made]);
    toast.success(`Added ${n} slot${n > 1 ? 's' : ''}. Drag them into position.`);
  };

  const persist = async (publish) => {
    if (publish) {
      const unnamed = elements.filter((e) => e.type === 'slot' && !e.label.trim()).length;
      if (unnamed) return toast.error(`${unnamed} slot${unnamed > 1 ? 's have' : ' has'} no name. Select and name each slot first.`);
    }
    setBusy(publish ? 'publish' : 'save');
    try {
      if (publish) { await api.post(`/layouts/${floorId}/publish`, { elements }); setStatus('published'); toast.success('Layout published. Slots are live.'); reload(); }
      else { await api.put(`/layouts/${floorId}`, { elements }); setStatus('draft'); toast.success('Draft saved'); }
      setDirty(false);
    } catch (e) { toast.error(errMsg(e)); }
    finally { setBusy(''); }
  };

  const switchFloor = (id) => {
    if (dirty && !window.confirm('You have unsaved changes on this floor. Discard them?')) return;
    setFloorId(id);
  };

  if (!selectedId) return <NoFacility />;

  const tool = (Icon, label, onClick) => (
    <button type="button" className="btn-secondary justify-start" onClick={onClick}><Icon className="h-4 w-4" />{label}</button>
  );

  return (
    <>
      <PageHeader title="Layout designer" subtitle="Draw the floor plan. Slot shapes become real parking slots when you publish.">
        {dirty && <span className="text-xs font-semibold text-amber-600">Unsaved changes</span>}
        <Badge status={status === 'published' ? 'completed' : 'pending'}>{status === 'published' ? 'Published' : 'Draft'}</Badge>
        <button className="btn-secondary" onClick={() => persist(false)} disabled={!floorId || Boolean(busy)}><Save className="h-4 w-4" />Save draft</button>
        <button className="btn-primary" onClick={() => persist(true)} disabled={!floorId || Boolean(busy)}><UploadCloud className="h-4 w-4" />Publish</button>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[170px_minmax(0,1fr)_250px]"></div>
      {!floors.length ? (
        <div className="card p-10 text-center text-sm text-slate-500">This facility has no floors yet. Ask your admin to add one under Facilities.</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
          <aside className="space-y-4">
            <div className="card space-y-3 p-4">
              <Field label="Floor">
                <select className="input" value={floorId} onChange={(e) => switchFloor(e.target.value)}>{floors.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}</select>
              </Field>
            </div>
            <div className="card space-y-2 p-4">
              <p className="label">Parking slots</p>
              <div className="flex gap-2">
                <input className="input !w-16 text-center font-bold uppercase" maxLength={3} value={prefix} onChange={(e) => setPrefix(e.target.value)} aria-label="Slot prefix" />
                <input className="input !w-16 text-center" type="number" min={1} max={60} value={count} onChange={(e) => setCount(e.target.value)} aria-label="How many slots" />
                <button className="btn-primary flex-1" onClick={() => addSlots()}><Plus className="h-4 w-4" />Add</button>
              </div>
              <p className="text-xs text-slate-400">Adds {count || 1} four-wheeler slots named {prefix.toUpperCase() || 'A'}01, {prefix.toUpperCase() || 'A'}02…</p>
            </div>
            <div className="card grid gap-2 p-4">
              <p className="label">Add to floor</p>
              {tool(Car, 'Single slot', () => addSlots(1))}
              {tool(Route, 'Road / pathway', () => addShape('road'))}
              {tool(DoorOpen, 'Entry gate', () => addShape('entry'))}
              {tool(DoorClosed, 'Exit gate', () => addShape('exit'))}
              {tool(MoveRight, 'Direction arrow', () => addShape('arrow'))}
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <div className="card p-3">
              <div ref={box} className="overflow-x-auto rounded-lg border border-slate-200 bg-white" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: `${GRID * 2 * scale}px ${GRID * 2 * scale}px` }}>
                {loading ? <div className="grid h-80 place-items-center"><Spinner /></div> : (
                  <Stage
                    ref={stageRef} width={CANVAS.width * scale} height={CANVAS.height * scale} scaleX={scale} scaleY={scale}
                    onMouseDown={(e) => e.target === e.target.getStage() && setSelId(null)}
                    onTouchStart={(e) => e.target === e.target.getStage() && setSelId(null)}
                  >
                    <Layer>
                      {elements.map((el) => (
                        <Group
                          key={el.id} id={el.id} x={el.x} y={el.y} rotation={el.rotation || 0} draggable
                          onClick={() => setSelId(el.id)} onTap={() => setSelId(el.id)} onDragStart={() => setSelId(el.id)}
                          onDragEnd={(e) => {
                            const x = clamp(snap(e.target.x()), 0, CANVAS.width - 10);
                            const y = clamp(snap(e.target.y()), 0, CANVAS.height - 10);
                            e.target.position({ x, y });
                            update(el.id, { x, y });
                          }}
                          onTransformEnd={(e) => {
                            const n = e.target;
                            const sx = n.scaleX(); const sy = n.scaleY();
                            n.scaleX(1); n.scaleY(1);
                            update(el.id, { x: snap(n.x()), y: snap(n.y()), width: Math.max(20, snap(el.width * sx)), height: Math.max(20, snap(el.height * sy)), rotation: Math.round(n.rotation()) });
                          }}
                        >
                          <ElementBody el={el} />
                        </Group>
                      ))}
                      <Transformer ref={trRef} rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]} anchorSize={9} borderStroke="#2563eb" anchorStroke="#2563eb" boundBoxFunc={(o, n) => (n.width < 20 || n.height < 20 ? o : n)} />
                    </Layer>
                  </Stage>
                )}
              </div>
              <p className="mt-2 px-1 text-xs text-slate-400">Click a shape to select it. Drag to move, use the handles to resize or rotate. Delete key removes, Ctrl/Cmd + D duplicates.</p>
            </div>

            <div className="card p-4">
              {selected ? (
                <div className="flex flex-wrap items-end gap-3">
                  <p className="mr-2 self-center text-sm font-bold capitalize text-slate-900">{selected.type === 'slot' ? 'Parking slot' : selected.type}</p>
                  {selected.type !== 'arrow' && (
                    <Field label={selected.type === 'slot' ? 'Slot name' : 'Label'}>
                      <input className="input !w-32 font-bold uppercase" maxLength={20} value={selected.label} onChange={(e) => update(selected.id, { label: e.target.value })} placeholder={selected.type === 'slot' ? 'A01' : ''} />
                    </Field>
                  )}
                  <Field label="Width"><input className="input !w-20" type="number" min={20} value={selected.width} onChange={(e) => update(selected.id, { width: Math.max(20, Number(e.target.value) || 20) })} /></Field>
                  <Field label="Height"><input className="input !w-20" type="number" min={20} value={selected.height} onChange={(e) => update(selected.id, { height: Math.max(20, Number(e.target.value) || 20) })} /></Field>
                  <Field label="Rotation"><input className="input !w-20" type="number" value={selected.rotation} onChange={(e) => update(selected.id, { rotation: Number(e.target.value) || 0 })} /></Field>
                  <button className="btn-secondary" onClick={duplicate}><Copy className="h-4 w-4" />Duplicate</button>
                  <button className="btn-danger" onClick={remove}><Trash2 className="h-4 w-4" />Delete</button>
                </div>
              ) : <p className="text-sm text-slate-500">Select a shape to edit its name, size and rotation.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );

}
