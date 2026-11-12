import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/common/ui';

// adminOnly: admin pages. driverOnly: driver portal. No flag: manager panel (admins and managers).
export default function ProtectedRoute({ adminOnly = false, driverOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-full place-items-center"><Spinner /></div>;
  if (!user) return <Navigate to={driverOnly ? '/driver/login' : '/login'} replace />;
  if (driverOnly) return user.role === 'driver' ? <Outlet /> : <Navigate to="/" replace />;
  if (user.role === 'driver') return <Navigate to="/driver" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}
