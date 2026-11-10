import { useEffect, useState } from 'react';
import { Plus, Pencil, Layers, Trash2, MapPin, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import { PageHeader, Modal, Field, Badge, Empty } from '../../components/common/ui';

const BLANK = { name: '', address: '', city: '', openTime: '06:00', closeTime: '22:00' };

function FloorsModal({ facility, onClose, onChanged }) {
  const [floors, setFloors] = useState([]);
  const [name, setName] = useState('');
  const [level, setLevel] = useState(0);
  const [edit, setEdit] = useState(null);
  const load = () => api.get(`/facilities/${facility._id}/floors`).then((r) => setFloors(r.data));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const run = async (fn, ok) => { try { await fn(); toast.success(ok); await load(); onChanged(); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <Modal open onClose={onClose} title={`Floors · ${facility.name}`} wide>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {floors.map((f) => (
          <li key={f._id} className="flex items-center gap-3 px-4 py-3">
            {edit?.id === f._id ? (
              <>
                <input className="input" autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                <button className="btn-primary btn-sm" onClick={() => run(() => api.put(`/facilities/floors/${f._id}`, { name: edit.name }).then(() => setEdit(null)), 'Floor renamed')}>Save</button>
                <button className="btn-ghost btn-sm" onClick={() => setEdit(null)}>Cancel</button>
              </>
            ) : (
              <>
                <div className="flex-1"><p className="font-bold text-slate-800">{f.name}</p><p className="text-xs text-slate-500">Level {f.level} · {f.stats.total} slots · layout {f.layoutStatus}</p></div>
                <button className="btn-ghost btn-sm" onClick={() => setEdit({ id: f._id, name: f.name })} aria-label="Rename"><Pencil className="h-4 w-4" /></button>
                <button className="btn-ghost btn-sm text-red-600" aria-label="Delete floor" onClick={() => window.confirm(`Delete ${f.name} and its ${f.stats.total} slots?`) && run(() => api.delete(`/facilities/floors/${f._id}`), 'Floor deleted')}><Trash2 className="h-4 w-4" /></button>
              </>
            )}
          </li>
        ))}
        {!floors.length && <li className="px-4 py-6 text-center text-sm text-slate-500">No floors yet.</li>}
      </ul>
      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); run(() => api.post(`/facilities/${facility._id}/floors`, { name, level }).then(() => { setName(''); setLevel(level + 1); }), 'Floor added'); }}>
        <Field label="New floor name"><input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Second Floor" /></Field>
        <Field label="Level"><input className="input !w-20" type="number" value={level} onChange={(e) => setLevel(Number(e.target.value))} /></Field>
        <button className="btn-primary"><Plus className="h-4 w-4" />Add floor</button>
      </form>
      <p className="mt-3 text-xs text-slate-400">Design each floor's slots in the Layout designer.</p>
    </Modal>
  );
}

export default function Facilities() {
  const { facilities, reload } = useFacility();
  const [form, setForm] = useState(null);
  const [floorsFor, setFloorsFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (form._id) await api.put(`/facilities/${form._id}`, form); else await api.post('/facilities', form);
      toast.success(form._id ? 'Facility updated' : 'Facility created'); setForm(null); reload();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const toggle = async (f) => {
    try { await api.put(`/facilities/${f._id}`, { isActive: !f.isActive }); toast.success(f.isActive ? 'Facility deactivated' : 'Facility activated'); reload(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <>
      <PageHeader title="Facilities" subtitle="Manage every parking location from one account.">
        <button className="btn-primary" onClick={() => setForm(BLANK)}><Plus className="h-4 w-4" />Add facility</button>
      </PageHeader>

      {facilities.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {facilities.map((f) => (
            <article key={f._id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{f.name}</h2>
                <Badge status={f.isActive ? 'available' : 'inactive'}>{f.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="mt-2 flex items-start gap-2 text-sm text-slate-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{f.address}{f.city ? `, ${f.city}` : ''}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><Clock className="h-4 w-4" />{f.openTime} – {f.closeTime}</p>
              <p className="mt-4 text-sm text-slate-600"><b className="text-slate-900">{f.stats.total}</b> slots · <b className="text-slot-available">{f.stats.available}</b> free · <b className="text-slot-occupied">{f.stats.occupied}</b> occupied</p>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button className="btn-secondary btn-sm" onClick={() => setForm(f)}><Pencil className="h-3.5 w-3.5" />Edit</button>
                <button className="btn-secondary btn-sm" onClick={() => setFloorsFor(f)}><Layers className="h-3.5 w-3.5" />Floors</button>
                <button className="btn-ghost btn-sm ml-auto" onClick={() => toggle(f)}>{f.isActive ? 'Deactivate' : 'Activate'}</button>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="card"><Empty title="No facilities yet">Add your first parking facility to get started.</Empty></div>}

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?._id ? 'Edit facility' : 'Add facility'}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <Field label="Facility name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Address"><input className="input" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="City"><input className="input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Opens at"><input type="time" className="input" value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} /></Field>
              <Field label="Closes at"><input type="time" className="input" value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} /></Field>
            </div>
            <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{form._id ? 'Save changes' : 'Create facility'}</button>
          </form>
        )}
      </Modal>
      {floorsFor && <FloorsModal facility={floorsFor} onClose={() => setFloorsFor(null)} onChanged={reload} />}
    </>
  );
}
