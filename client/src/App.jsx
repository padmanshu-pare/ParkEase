import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/layout/Layout';
import DriverLayout from './components/layout/DriverLayout';
import Login from './pages/manager/Login';
import Dashboard from './pages/manager/Dashboard';
import VehicleEntry from './pages/manager/VehicleEntry';
import VehicleExit from './pages/manager/VehicleExit';
import Slots from './pages/manager/Slots';
import History from './pages/manager/History';
import Payments from './pages/manager/Payments';
import LayoutDesigner from './pages/manager/LayoutDesigner';
import Reservations from './pages/manager/Reservations';
import Settings from './pages/manager/Settings';
import Facilities from './pages/admin/Facilities';
import Managers from './pages/admin/Managers';
import Drivers from './pages/admin/Drivers';
import DriverLogin from './pages/driver/DriverLogin';
import DriverFacilities from './pages/driver/Facilities';
import DriverBook from './pages/driver/Book';
import DriverBookings from './pages/driver/Bookings';
import DriverProfile from './pages/driver/Profile';
import PublicAvailability from './pages/public/Availability';
import Legal from './pages/legal/Legal';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/driver/login" element={<DriverLogin />} />
      <Route path="/availability" element={<PublicAvailability />} />
      <Route path="/privacy" element={<Legal kind="privacy" />} />
      <Route path="/terms" element={<Legal kind="terms" />} />
      <Route path="/refund" element={<Legal kind="refund" />} />

      <Route element={<ProtectedRoute driverOnly />}>
        <Route element={<DriverLayout />}>
          <Route path="/driver" element={<DriverFacilities />} />
          <Route path="/driver/book/:id" element={<DriverBook />} />
          <Route path="/driver/bookings" element={<DriverBookings />} />
          <Route path="/driver/profile" element={<DriverProfile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="entry" element={<VehicleEntry />} />
          <Route path="exit" element={<VehicleExit />} />
          <Route path="slots" element={<Slots />} />
          <Route path="history" element={<History />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="designer" element={<LayoutDesigner />} />
          <Route path="settings" element={<Settings />} />
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="facilities" element={<Facilities />} />
            <Route path="managers" element={<Managers />} />
            <Route path="drivers" element={<Drivers />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
