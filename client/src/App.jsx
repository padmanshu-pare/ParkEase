import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/manager/Login';
import Dashboard from './pages/manager/Dashboard';
import VehicleEntry from './pages/manager/VehicleEntry';
import VehicleExit from './pages/manager/VehicleExit';
import Slots from './pages/manager/Slots';
import History from './pages/manager/History';
import Payments from './pages/manager/Payments';
import LayoutDesigner from './pages/manager/LayoutDesigner';
import Settings from './pages/manager/Settings';
import Facilities from './pages/admin/Facilities';
import Managers from './pages/admin/Managers';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="entry" element={<VehicleEntry />} />
          <Route path="exit" element={<VehicleExit />} />
          <Route path="slots" element={<Slots />} />
          <Route path="history" element={<History />} />
          <Route path="payments" element={<Payments />} />
          <Route path="designer" element={<LayoutDesigner />} />
          <Route path="settings" element={<Settings />} />
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="facilities" element={<Facilities />} />
            <Route path="managers" element={<Managers />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
