import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errMsg } from '../../services/api';
import { useFacility } from '../../context/FacilityContext';
import { PageHeader, Modal, Field, Badge, Empty, Spinner } from '../../components/common/ui';

const BLANK = { name: '', email: '', phone: '', password: '', facilities: [], isActive: true };

export default function Managers() {
  const { facilities } = useFacility();
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get('/users/managers').then((r) => setList(r.data)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => { load(); }, [load]);

  const edit = (m) => setForm({ _id: m._id, name: m.name, email: m.email, phone: m.phone || '', password: '', isActive: m.isActive, facilities: m.facilities.map((f) => f._id) });
  const toggleFacility = (id) => setForm((f) => ({ ...f, facilities: f.facilities.includes(id) ? f.facilities.filter((x) => x !== id) : [...f.facilities, id] }));

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (form._id) { const { email, ...rest } = form; await api.put(`/users/managers/${form._id}`, { ...rest, password: form.password || undefined }); }
      else await api.post('/users/managers', form);
      toast.success(form._id ? 'Manager updated' : 'Manager added'); setForm(null); load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const toggleActive = async (m) => {
    try { await api.put(`/users/managers/${m._id}`, { isActive: !m.isActive }); toast.success(m.isActive ? 'Manager deactivated' : 'Manager activated'); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <>
      <PageHeader title="Managers" subtitle="People who run entry and exit at your facilities.">
        <button className="btn-primary" onClick={() => setForm(BLANK)}><Plus className="h-4 w-4" />Add manager</button>
      </PageHeader>

      <div className="card overflow-hidden">
        {!list ? <div className="grid place-items-center py-16"><Spinner /></div> : list.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-slate-200 bg-slate-50"><tr>{['Name', 'Contact', 'Facilities', 'Status', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((m) => (
                  <tr key={m._id}>
                    <td className="td font-bold text-slate-800">{m.name}</td>
                    <td className="td text-slate-500">{m.email}<br />{m.phone}</td>
                    <td className="td text-slate-600">{m.facilities.map((f) => f.name).join(', ') || <span className="text-slate-400">None assigned</span>}</td>
                    <td className="td"><Badge status={m.isActive ? 'available' : 'inactive'}>{m.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="td text-right">
                      <button className="btn-ghost btn-sm" onClick={() => edit(m)}><Pencil className="h-3.5 w-3.5" />Edit</button>
                      <button className="btn-ghost btn-sm" onClick={() => toggleActive(m)}>{m.isActive ? 'Deactivate' : 'Activate'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty icon={Users} title="No managers yet">Add a manager and choose which facilities they can operate.</Empty>}
      </div>

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form?._id ? 'Edit manager' : 'Add manager'}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <Field label="Full name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email (used to log in)"><input className="input" type="email" required disabled={Boolean(form._id)} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label={form._id ? 'New password (leave blank to keep)' : 'Password'}><input className="input" type="password" minLength={6} required={!form._id} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <div>
              <span className="label">Facilities this manager can operate</span>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {facilities.map((f) => (
                  <label key={f._id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={form.facilities.includes(f._id)} onChange={() => toggleFacility(f._id)} />{f.name}
                  </label>
                ))}
                {!facilities.length && <p className="p-2 text-sm text-slate-500">Create a facility first.</p>}
              </div>
            </div>
            <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{form._id ? 'Save changes' : 'Add manager'}</button>
          </form>
        )}
      </Modal>
    </>
  );
}
