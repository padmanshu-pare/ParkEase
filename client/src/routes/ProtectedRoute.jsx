import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/common/ui';

export default function ProtectedRoute({ adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid h-full place-items-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}
