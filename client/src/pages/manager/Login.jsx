import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ParkingSquare, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { errMsg } from '../../services/api';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response ? errMsg(err) : err.message === 'Network Error' ? errMsg({ code: 'ERR_NETWORK' }) : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-navy-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600"><ParkingSquare className="h-6 w-6" /></span>
          <span className="text-xl font-extrabold">ParkEase</span>
        </div>
        <div>
          <p className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Every slot, every vehicle, one clear picture.</p>
          <p className="mt-4 max-w-md text-slate-300">Manage entries, exits and payments for your parking facilities, with live slot status on your own floor plan.</p>
        </div>
        <p className="text-sm text-slate-400">Manager Panel</p>
      </div>
      <div className="grid place-items-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Log in</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">Use the account your admin created for you.</p>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoFocus className="input mb-4" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required className="input mb-6" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Log in</button>
        </form>
      </div>
    </div>
  );
}
