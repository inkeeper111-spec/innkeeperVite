import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { RawMaterialMasterPage } from './pages/inventory/RawMaterialMasterPage';
import { ExpensesPage } from './pages/expenses/ExpensesPage';
import { MaintenancePage } from './pages/maintenance/MaintenancePage';
import { StaffPage } from './pages/staff/StaffPage';
import { RolesResponsibilitiesPage } from './pages/staff/RolesResponsibilitiesPage';
import { MyAttendancePage } from './pages/staff/MyAttendancePage';
import LeaveRequestsPage from './pages/staff/LeaveRequestsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AIAssistantPage } from './pages/dashboard/AIAssistantPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Super Admin
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { SubscriptionSelection } from './pages/subscription/SubscriptionSelection';
import { RegistrationStatus } from './pages/subscription/RegistrationStatus';
import { SubscriptionPaymentStatus } from './pages/subscription/SubscriptionPaymentStatus';

// Notifications
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { STAFF_ROLES } from './auth/staffSession';

// Menu Management
import { MenuManagementPage } from './pages/restaurant/MenuManagementPage';

// Route Protectors
const getHotelGatePath = (hotel) => {
  if (!hotel) return null;
  const registrationStatus = hotel.registrationStatus
    || (hotel.status === 'pending_approval' ? 'pending' : hotel.status === 'rejected' ? 'rejected' : 'approved');
  if (registrationStatus === 'pending') return '/registration/pending';
  if (registrationStatus === 'rejected') return '/registration/rejected';
  if (registrationStatus === 'suspended' || hotel.status === 'suspended') return '/registration/suspended';

  const subscription = hotel.currentSubscription;
  const paidThrough = subscription?.endDate && new Date(subscription.endDate) > new Date();
  if (hotel.subscriptionStatus === 'suspended') return '/subscription?status=suspended';
  if (subscription && ['active', 'canceled', 'trialing'].includes(subscription.status) && paidThrough) return null;
  if (subscription?.status === 'pending' || subscription?.status === 'past_due') return '/subscription?payment=pending';
  if (subscription?.endDate && new Date(subscription.endDate) <= new Date()) return '/subscription?renewal=1';
  return '/subscription';
};

const getPermissionFallbackPath = (user, currentPath) => {
  const candidates = {
    hotel_admin: [['/dashboard', 'dashboard.view']],
    receptionist: [['/frontdesk', 'frontdesk.view'], ['/reservations', 'reservations.view'], ['/notifications', 'notifications.view']],
    restaurant_staff: [['/restaurant', 'restaurant.view'], ['/notifications', 'notifications.view']],
    housekeeping_staff: [['/housekeeping', 'housekeeping.view'], ['/notifications', 'notifications.view']],
    maintenance_staff: [['/maintenance', 'maintenance.view'], ['/notifications', 'notifications.view']],
    super_admin: [['/superadmin', null]]
  }[user.role] || [];

  return candidates.find(([path, permission]) => (
    path !== currentPath && (!permission || user.permissions?.[permission] !== false)
  ))?.[0] || '/login';
};

const ProtectedRoute = ({
  children,
  allowedRoles = STAFF_ROLES,
  skipStatusGate = false,
  strictRoleGate = false,
  deniedPath
}) => {
  const { user, hotel, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const permissionForPath = {
    '/dashboard': 'dashboard.view',
    '/frontdesk': 'frontdesk.view',
    '/reservations': 'reservations.view',
    '/rooms': 'rooms.view',
    '/guests': 'guests.view',
    '/billing': 'billing.view',
    '/housekeeping': 'housekeeping.view',
    '/restaurant': 'restaurant.view',
    '/menu-management': 'menu_management.view',
    '/inventory': 'inventory.view',
    '/inventory/dashboard': 'inventory.view',
    '/inventory/categories': 'inventory.view',
    '/inventory/items': 'inventory.view',
    '/inventory/stock': 'inventory.view',
    '/inventory/raw-materials': 'inventory.view',
    '/inventory/raw-material-categories': 'inventory.view',
    '/inventory/recipes': 'inventory.view',
    '/maintenance': 'maintenance.view',
    '/expenses': 'expenses.view',
    '/staff': 'staff_directory.view',
    '/roles-responsibilities': 'roles_responsibilities.view',
    '/leave-management': 'leave.view',
    '/my-leave': 'leave.view',
    '/attendance': 'staff_self.view',
    '/reports': 'reports.view',
    '/ai-assistant': 'ai_assistant.view',
    '/notifications': 'notifications.view',
    '/settings': 'settings.view'
  }[location.pathname];
  const overrides = user.permissionOverrides || {};
  const hasPermissionOverride = permissionForPath && Object.hasOwn(overrides, permissionForPath);
  const hasRouteAccess = permissionForPath && user.permissions
    ? user.permissions[permissionForPath] === true
    : hasPermissionOverride
      ? overrides[permissionForPath]
    : allowedRoles.includes(user.role);
  if ((strictRoleGate && user.role !== 'super_admin' && !allowedRoles.includes(user.role))
    || (!hasRouteAccess && (strictRoleGate || user.role !== 'super_admin'))) {
    return <Navigate to={deniedPath || getPermissionFallbackPath(user, location.pathname)} replace />;
  }
  if (!skipStatusGate && user.role !== 'super_admin') {
    const gatePath = getHotelGatePath(hotel);
    if (gatePath) {
      const target = new URL(gatePath, window.location.origin);
      if (location.pathname !== target.pathname) return <Navigate to={gatePath} replace />;
    }
  }

  return children;
};

export const App = () => {
  const { user, hotel } = useAuth();
  const loginPath = user?.role === 'super_admin' ? '/superadmin' : getHotelGatePath(hotel)
    || (user?.role === 'receptionist' ? '/frontdesk'
      : user?.role === 'restaurant_staff' ? '/restaurant'
        : user?.role === 'housekeeping_staff' ? '/housekeeping'
          : user?.role === 'maintenance_staff' ? '/maintenance'
            : '/dashboard');

  return (
    <Routes key={user?.id || user?._id || 'anonymous'}>
      {/* Public authentication entry */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={user ? <Navigate to={loginPath} replace /> : <Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/registration/pending" element={<ProtectedRoute skipStatusGate><RegistrationStatus status="pending" /></ProtectedRoute>} />
      <Route path="/registration/rejected" element={<ProtectedRoute skipStatusGate><RegistrationStatus status="rejected" /></ProtectedRoute>} />
      <Route path="/registration/suspended" element={<ProtectedRoute skipStatusGate><RegistrationStatus status="suspended" /></ProtectedRoute>} />
      <Route
        path="/subscription"
        element={
          <ProtectedRoute
            allowedRoles={['hotel_admin']}
            skipStatusGate
            strictRoleGate
            deniedPath="/superadmin/modules"
          >
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SubscriptionSelection />} />
        <Route path="success" element={<SubscriptionPaymentStatus success />} />
        <Route path="failure" element={<SubscriptionPaymentStatus success={false} />} />
      </Route>

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
        <Route
          path="/inventory/raw-material-categories"
          element={
            <ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']} strictRoleGate>
              <RawMaterialMasterPage />
            </ProtectedRoute>
          }
        />
        <Route path="/inventory/raw-materials" element={<RawMaterialMasterPage />} />
        <Route path="/inventory/*" element={<InventoryPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route
          path="/roles-responsibilities"
          element={
            <ProtectedRoute allowedRoles={['hotel_admin']}>
              <RolesResponsibilitiesPage />
            </ProtectedRoute>
          }
        />
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
        <Route
          path="/superadmin/modules"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboard initialTab="modules" />
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
