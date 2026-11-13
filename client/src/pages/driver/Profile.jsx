import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Trash2, Plus } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Spinner, Field } from '../../components/common/ui';

export default function Profile() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [vehicle, setVehicle] = useState({ regNumber: '', label: '' });
  const [busy, setBusy] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const load = () => api.get('/driver/me').then(({ data }) => {
    setUser(data.user);
    setForm({ name: data.user.name, phone: data.user.phone || '' });
  }).catch((e) => toast.error(errMsg(e)));
  useEffect(() => { load(); }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put('/driver/me', form);
      setUser(data.user);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const addVehicle = async (e) => {
    e.preventDefault();
    try {
      await api.post('/driver/vehicles', vehicle);
      setVehicle({ regNumber: '', label: '' });
      toast.success('Vehicle saved');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const removeVehicle = async (regNumber) => {
    try {
      await api.delete(`/driver/vehicles/${regNumber}`);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const deleteAccount = async () => {
    if (deleteText !== 'DELETE') return;
    if (!window.confirm('Delete your account? Upcoming bookings will be cancelled. This cannot be undone.')) return;
    setBusy(true);
    try {
      await api.delete('/driver/me', { data: { confirm: 'DELETE' } });
      toast.success('Your account has been deleted');
      logout();
      navigate('/driver/login');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (!user) return <div className="grid place-items-center py-24"><Spinner /></div>;

  return (
    <div>
      <PageHeader title="Profile and vehicles" subtitle={user.email} />
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="card space-y-4 p-6">
          <h2 className="font-bold text-slate-900">Your details</h2>
          <Field label="Full name">
            <input className="input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98xxxxxxxx" />
          </Field>
          <button className="btn-primary" disabled={busy}>Save details</button>
        </form>

        <div className="card p-6">
          <h2 className="font-bold text-slate-900">Saved vehicles</h2>
          <p className="mb-4 text-sm text-slate-500">Up to 5 vehicles. You can only book a vehicle that is saved here.</p>
          {!user.vehicles.length && <p className="mb-4 text-sm text-slate-500">No vehicles saved yet.</p>}
          <ul className="mb-5 space-y-2">
            {user.vehicles.map((v) => (
              <li key={v.regNumber} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5">
                <div>
                  <p className="font-mono font-semibold text-slate-900">{v.regNumber}</p>
                  {v.label && <p className="text-xs text-slate-500">{v.label}</p>}
                </div>
                <button className="btn-ghost btn-sm text-red-600" onClick={() => removeVehicle(v.regNumber)} aria-label="Remove vehicle"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <form onSubmit={addVehicle} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input className="input uppercase" required placeholder="MP17AB1234" value={vehicle.regNumber} onChange={(e) => setVehicle({ ...vehicle, regNumber: e.target.value })} />
            <input className="input" maxLength={30} placeholder="Label (optional)" value={vehicle.label} onChange={(e) => setVehicle({ ...vehicle, label: e.target.value })} />
            <button className="btn-secondary"><Plus className="h-4 w-4" />Add</button>
          </form>
        </div>
      </div>

      <div className="card mt-6 border-red-200 p-6">
        <h2 className="font-bold text-red-700">Delete account</h2>
        <p className="mb-4 mt-1 text-sm text-slate-600">
          This cancels your upcoming bookings and removes your name, email, phone and saved vehicles. Parking history and payments are kept without your personal details, as required for accounting.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label='Type DELETE to confirm'>
            <input className="input w-56" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} />
          </Field>
          <button className="btn-danger" disabled={busy || deleteText !== 'DELETE'} onClick={deleteAccount}>Delete my account</button>
        </div>
      </div>
    </div>
  );
}
