import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ParkingSquare, Loader2, Eye, EyeOff, ShieldCheck, Radio, Receipt, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { errMsg } from '../../services/api';

const FEATURES = [
  { icon: Radio, title: 'Live floor status', text: 'See every slot change the moment a vehicle enters or leaves.' },
  { icon: Receipt, title: 'Automatic billing', text: 'Fees are calculated on the server and printed as receipts.' },
  { icon: LayoutGrid, title: 'Your own layout', text: 'Draw your floor once, then publish it to create live slots.' },
];

// Static preview of a floor, for the brand panel only (not live data)
const PREVIEW = ['free', 'occ', 'free', 'free', 'res', 'free', 'occ', 'free', 'free', 'res', 'free', 'free'];
const dot = { free: 'bg-emerald-400', occ: 'bg-rose-400', res: 'bg-amber-300' };

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: localStorage.getItem('parkease_last_email') || '', password: '' });
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  // Optional demo login. Only shown when VITE_DEMO_EMAIL and VITE_DEMO_PASSWORD are set at build time.
  // The server enforces read-only access for this account.
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
      localStorage.setItem('parkease_last_email', form.email);
      navigate('/');
    } catch (err) {
      setError(err.response ? errMsg(err) : err.message === 'Network Error' ? errMsg({ code: 'ERR_NETWORK' }) : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-navy-900 to-navy-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/30"><ParkingSquare className="h-6 w-6" /></span>
          <span className="text-xl font-extrabold">ParkEase</span>
        </div>

        <div className="relative">
          <p className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Every slot, every vehicle, one clear picture.</p>
          <p className="mt-4 max-w-md text-slate-300">Manage entries, exits and payments for your parking facilities, with live slot status on your own floor plan.</p>

          <div className="mt-10 max-w-sm rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold">Ground floor (preview)</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Live</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {PREVIEW.map((s, i) => <span key={i} className={`h-6 rounded-md ${dot[s]} opacity-90`} />)}
            </div>
          </div>

          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10"><Icon className="h-5 w-5 text-emerald-300" /></span>
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="text-sm text-slate-300">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-sm text-slate-400"><ShieldCheck className="h-4 w-4" />Manager panel · role-based access</p>
      </aside>

      {/* Form */}
      <main className="grid place-items-center bg-slate-50 p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white"><ParkingSquare className="h-5 w-5" /></span>
            <span className="text-lg font-extrabold text-slate-900">ParkEase</span>
          </div>

          <form onSubmit={submit} className="card p-7 shadow-xl shadow-slate-900/5">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mb-6 mt-1 text-sm text-slate-500">Log in with the account your admin created for you.</p>

            {error && (
              <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <label className="label" htmlFor="email">Email</label>
            <input
              id="email" type="email" required autoFocus autoComplete="username"
              className="input mb-4" placeholder="you@company.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <div className="mb-1 flex items-center justify-between">
              <label className="label mb-0" htmlFor="password">Password</label>
            </div>
            <div className="relative mb-6">
              <input
                id="password" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                className="input pr-11" placeholder="Your password"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button" onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button className="btn-primary w-full py-2.5" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Log in
            </button>

            {demoEmail && demoPassword && (
              <button
                type="button" className="btn-secondary mt-3 w-full"
                onClick={() => { setForm({ email: demoEmail, password: demoPassword }); setError(''); }}
              >
                Fill demo login (read-only)
              </button>
            )}
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-slate-500">
            <p>Are you a driver? <Link to="/driver/login" className="font-semibold text-brand-700 hover:underline">Driver login</Link></p>
            <p><Link to="/availability" className="font-semibold text-brand-700 hover:underline">See live availability</Link> without logging in</p>
          </div>
        </div>
      </main>
    </div>
  );
}
