import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ParkingSquare, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api, { errMsg } from '../../services/api';

export default function DriverLogin() {
  const { user, login, startSession } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === 'driver' ? '/driver' : '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password, ['driver']);
      } else {
        const { data } = await api.post('/driver/signup', form);
        startSession(data.token, data.user);
      }
      navigate('/driver');
    } catch (err) {
      toast.error(errMsg(err, err.message));
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="grid min-h-full place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600 text-white"><ParkingSquare className="h-6 w-6" /></span>
          <span className="text-xl font-extrabold text-slate-900">ParkEase</span>
        </div>
        <form onSubmit={submit} className="card p-6">
          <h1 className="text-xl font-extrabold text-slate-900">{mode === 'login' ? 'Driver log in' : 'Create driver account'}</h1>
          <p className="mb-5 mt-1 text-sm text-slate-500">Book parking slots in advance and manage your vehicles.</p>

          {mode === 'signup' && (
            <>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" required className="input mb-4" value={form.name} onChange={set('name')} />
              <label className="label" htmlFor="phone">Phone (optional)</label>
              <input id="phone" className="input mb-4" value={form.phone} onChange={set('phone')} placeholder="+91 98xxxxxxxx" />
            </>
          )}
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input mb-4" value={form.email} onChange={set('email')} />
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={6} className="input mb-6" value={form.password} onChange={set('password')} />

          <button className="btn-primary w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
          <button type="button" className="mt-4 w-full text-center text-sm font-semibold text-brand-700" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Check live availability without logging in: <Link to="/availability" className="font-semibold text-brand-700">public page</Link>
        </p>
      </div>
    </div>
  );
}
