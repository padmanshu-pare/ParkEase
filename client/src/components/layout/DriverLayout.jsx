import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ParkingSquare, Building2, CalendarDays, UserRound, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/driver', label: 'Find parking', icon: Building2, end: true },
  { to: '/driver/bookings', label: 'My bookings', icon: CalendarDays },
  { to: '/driver/profile', label: 'Profile', icon: UserRound },
];

export default function DriverLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><ParkingSquare className="h-4 w-4" /></span>
          <span className="font-extrabold tracking-tight text-slate-900">ParkEase</span>
        </div>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 md:inline">Hi, {user.name.split(' ')[0]}</span>
          <button className="btn-ghost btn-sm" onClick={() => { logout(); navigate('/driver/login'); }}>
            <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl"><Outlet /></div>
      </main>
    </div>
  );
}
