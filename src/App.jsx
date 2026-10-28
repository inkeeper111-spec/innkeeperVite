import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

// Hotel App Pages
import { Dashboard } from './pages/dashboard/Dashboard';
import { FrontDesk } from './pages/frontdesk/FrontDesk';
import { ReservationsPage } from './pages/reservations/ReservationsPage';
import { RoomsPage } from './pages/rooms/RoomsPage';
import { GuestsPage } from './pages/guests/GuestsPage';
import { BillingPage } from './pages/billing/BillingPage';
import { HousekeepingPage } from './pages/housekeeping/HousekeepingPage';
import { RestaurantPOS } from './pages/restaurant/RestaurantPOS';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { ExpensesPage } from './pages/expenses/ExpensesPage';
import { MaintenancePage } from './pages/maintenance/MaintenancePage';
import { StaffPage } from './pages/staff/StaffPage';
import { MyAttendancePage } from './pages/staff/MyAttendancePage';
import LeaveRequestsPage from './pages/staff/LeaveRequestsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AIAssistantPage } from './pages/dashboard/AIAssistantPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Super Admin
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';

// Notifications
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { STAFF_ROLES } from './auth/staffSession';

// Menu Management
import { MenuManagementPage } from './pages/restaurant/MenuManagementPage';

// Route Protectors
const ProtectedRoute = ({ children, allowedRoles = STAFF_ROLES }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role) && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const App = () => {
  const { user } = useAuth();

  return (
    <Routes key={user?.id || user?._id || 'anonymous'}>
      {/* Public authentication entry */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={user ? <Navigate to={
        user.role === 'super_admin' ? '/superadmin'
          : user.role === 'receptionist' ? '/frontdesk'
            : user.role === 'restaurant_staff' ? '/restaurant'
              : user.role === 'housekeeping_staff' ? '/housekeeping'
                : user.role === 'maintenance_staff' ? '/maintenance'
                  : '/dashboard'
      } replace /> : <Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Hotel Operational Module Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/frontdesk" element={<FrontDesk />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/guests" element={<GuestsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/housekeeping" element={<HousekeepingPage />} />
        <Route path="/restaurant" element={<RestaurantPOS />} />
        <Route path="/menu-management" element={<MenuManagementPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/attendance" element={<MyAttendancePage />} />
        <Route
          path="/leave-management"
          element={
            <ProtectedRoute allowedRoles={['hotel_admin']}>
              <LeaveRequestsPage management />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-leave"
          element={
            <ProtectedRoute allowedRoles={['hotel_admin', 'receptionist', 'restaurant_staff', 'housekeeping_staff', 'maintenance_staff']}>
              <LeaveRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Super Admin Console */}
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
