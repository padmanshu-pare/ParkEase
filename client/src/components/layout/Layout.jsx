import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, PencilRuler, Grid3x3, LogIn, LogOut, History, Wallet, Users, Settings, Menu, X, ParkingSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FacilityProvider, useFacility } from '../../context/FacilityContext';
import { Spinner } from '../common/ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/entry', label: 'Vehicle entry', icon: LogIn },
  { to: '/exit', label: 'Vehicle exit', icon: LogOut },
  { to: '/slots', label: 'Parking slots', icon: Grid3x3 },
  { to: '/history', label: 'Parking history', icon: History },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/designer', label: 'Layout designer', icon: PencilRuler },
  { to: '/facilities', label: 'Facilities', icon: Building2, admin: true },
  { to: '/managers', label: 'Managers', icon: Users, admin: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function Shell() {
  const { user, logout, isAdmin } = useAuth();
  const { facilities, selectedId, select, loading } = useFacility();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const items = NAV.filter((n) => !n.admin || isAdmin);

  const sidebar = (
    <nav className="flex h-full flex-col bg-navy-900 text-slate-300">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white"><ParkingSquare className="h-5 w-5" /></span>
        <span className="text-lg font-extrabold tracking-tight text-white">ParkEase</span>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-brand-600 text-white' : 'hover:bg-navy-800 hover:text-white'}`}
          >
            <Icon className="h-[18px] w-[18px]" />{label}
          </NavLink>
        ))}
      </div>
      <div className="border-t border-navy-700 p-4">
        <p className="truncate text-sm font-bold text-white">{user.name}</p>
        <p className="mb-3 truncate text-xs capitalize text-slate-400">{user.role}</p>
        <button className="btn w-full justify-start bg-navy-800 text-slate-200 hover:bg-navy-700" onClick={() => { logout(); navigate('/login'); }}>
          <LogOut className="h-4 w-4" />Log out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button className="btn-ghost btn-sm lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs font-semibold text-slate-500 sm:inline">Facility</span>
            <select className="input !w-auto min-w-[200px]" value={selectedId} onChange={(e) => select(e.target.value)} aria-label="Select facility" disabled={!facilities.length}>
              {!facilities.length && <option value="">No facilities</option>}
              {facilities.map((f) => <option key={f._id} value={f._id}>{f.name}{f.isActive ? '' : ' (inactive)'}</option>)}
            </select>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? <div className="grid place-items-center py-24"><Spinner /></div> : <Outlet />}
        </main>
      </div>
    </div>
  );
}

export default function Layout() {
  return <FacilityProvider><Shell /></FacilityProvider>;
}
