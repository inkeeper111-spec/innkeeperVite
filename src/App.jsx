import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { LandingPage } from './pages/LandingPage';
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
import { RestaurantBillingPage } from './pages/restaurant/RestaurantBillingPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { ProductionPage } from './pages/inventory/ProductionPage';
import { RawMaterialMasterPage } from './pages/inventory/RawMaterialMasterPage';
import { StorageLocationMasterPage } from './pages/inventory/StorageLocationMasterPage';
import { ProcurementPage } from './pages/inventory/ProcurementPage';
import { ExpensesPage } from './pages/expenses/ExpensesPage';
import { MaintenancePage } from './pages/maintenance/MaintenancePage';
import { StaffPage } from './pages/staff/StaffPage';
import { RolesResponsibilitiesPage } from './pages/staff/RolesResponsibilitiesPage';
import { MyAttendancePage } from './pages/staff/MyAttendancePage';
import LeaveRequestsPage from './pages/staff/LeaveRequestsPage';
import PayrollDashboardPage from './pages/payroll/PayrollDashboardPage';
import GlobalConfigurationPage from './pages/payroll/GlobalConfigurationPage';
import StatutoryDeductionsPage from './pages/payroll/StatutoryDeductionsPage';
import WeekoffPage from './pages/payroll/WeekoffPage';
import HolidaysPage, { HolidayUploadLogsPage } from './pages/payroll/HolidaysPage';
import LeaveConfigurationPage from './pages/payroll/LeaveConfigurationPage';
import EmployeesPage, { StaffUploadLogsPage } from './pages/payroll/EmployeesPage';
import AdvancePaymentsPage from './pages/payroll/AdvancePaymentsPage';
import AttendancePage from './pages/payroll/AttendancePage';
import PayrollRunPage from './pages/payroll/PayrollRunPage';
import PayslipsPage from './pages/payroll/PayslipsPage';
import FileConfigurationPage from './pages/payroll/FileConfigurationPage';
import PayrollReportsPage from './pages/payroll/PayrollReportsPage';
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
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { KeyRound } from 'lucide-react';

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
  const candidates = user.role === 'super_admin'
    ? [['/superadmin', null]]
    : [
      ['/restaurant', 'restaurant_pos.view'],
      ['/inventory/dashboard', 'inventory_dashboard.view'],
      ['/inventory/raw-materials', 'raw_materials.view'],
      ['/inventory/stock', 'stock_verification.view'],
      ['/housekeeping', 'housekeeping.view'],
      ['/frontdesk', 'frontdesk.view'],
      ['/reservations', 'reservations.view'],
      ['/maintenance', 'maintenance.view'],
      ['/notifications', 'notifications.view'],
      ['/dashboard', 'dashboard.view']
    ];

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

  if (loading) return <LoadingSpinner text="Restoring your workspace..." size="lg" />;
  if (!user) return <Navigate to="/login" replace />;

  const permissionForPath = {
    '/dashboard': 'dashboard.view',
    '/frontdesk': 'frontdesk.view',
    '/reservations': 'reservations.view',
    '/rooms': 'rooms.view',
    '/guests': 'guests.view',
    '/billing': 'billing.view',
    '/housekeeping': 'housekeeping.view',
    '/restaurant': 'restaurant_pos.view',
    '/restaurant-billing': 'restaurant_billing.view',
    '/menu-management': 'menu_management.view',
    '/inventory': 'inventory_dashboard.view',
    '/inventory/dashboard': 'inventory_dashboard.view',
    '/inventory/categories': 'raw_materials.view',
    '/inventory/items': 'raw_materials.view',
    '/inventory/stock': 'stock_verification.view',
    '/inventory/raw-materials': 'raw_materials.view',
    '/inventory/raw-material-categories': 'raw_materials.view',
    '/inventory/recipes': 'restaurant_recipes.view',
    '/inventory/production': 'food_production.view',
    '/inventory/storage-locations': 'storage_locations.view',
    '/procurement': 'procurement.view',
    '/maintenance': 'maintenance.view',
    '/expenses': 'expenses.view',
    '/staff': 'staff_directory.view',
    '/payroll': 'staff_directory.view',
    '/payroll/dashboard': 'staff_directory.view',
    '/payroll/global-configuration': 'staff_directory.view',
    '/payroll/statutory-deductions': 'staff_directory.view',
    '/payroll/weekoff': 'staff_directory.view',
    '/payroll/employees': 'staff_directory.view',
    '/payroll/employees/upload-logs': 'staff_directory.view',
    '/payroll/holidays': 'staff_directory.view',
    '/payroll/holidays/upload-logs': 'staff_directory.view',
    '/payroll/leave-configuration': 'staff_directory.view',
    '/payroll/advance-payments': 'staff_directory.view',
    '/payroll/attendance': 'staff_directory.view',
    '/payroll/run': 'staff_directory.view',
    '/payroll/payslips': 'staff_directory.view',
    '/payroll/file-configuration': 'staff_directory.view',
    '/payroll/reports': 'staff_directory.view',
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
  const readPermission = permissionForPath?.replace(/\.view$/, '.read');
  if (permissionForPath && user.permissions?.[permissionForPath] === true
    && readPermission && user.permissions[readPermission] === false) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-black text-slate-900">View-only module access</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          This module is visible to you, but its records are restricted. Ask your hotel administrator for Read access if you need to open module data.
        </p>
      </div>
    );
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
  const { user, hotel, loading } = useAuth();
  const loginPath = user?.role === 'super_admin' ? '/superadmin' : getHotelGatePath(hotel)
    || (user?.permissions?.['restaurant_pos.view'] ? '/restaurant'
      : user?.permissions?.['inventory_dashboard.view'] ? '/inventory/dashboard'
        : user?.role === 'receptionist' ? '/frontdesk'
        : user?.role === 'housekeeping_staff' ? '/housekeeping'
          : user?.role === 'maintenance_staff' ? '/maintenance'
            : '/dashboard');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner text="Preparing your workspace..." size="lg" />
      </div>
    );
  }

  return (
    <Routes key={user?.id || user?._id || 'anonymous'}>
      {/* Public authentication entry */}
      <Route path="/" element={user ? <Navigate to={loginPath} replace /> : <LandingPage />} />
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
        <Route
          path="/restaurant-billing"
          element={
            <ProtectedRoute>
              <RestaurantBillingPage />
            </ProtectedRoute>
          }
        />
        <Route path="/menu-management" element={<MenuManagementPage />} />
        <Route
          path="/inventory/raw-material-categories"
          element={
            <ProtectedRoute>
              <RawMaterialMasterPage />
            </ProtectedRoute>
          }
        />
        <Route path="/inventory/raw-materials" element={<RawMaterialMasterPage />} />
        <Route path="/inventory/production" element={<ProductionPage />} />
        <Route
          path="/inventory/storage-locations"
          element={
            <ProtectedRoute>
              <StorageLocationMasterPage />
            </ProtectedRoute>
          }
        />
        <Route path="/procurement" element={<ProcurementPage />} />
        <Route path="/inventory/*" element={<InventoryPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/payroll" element={<Navigate to="/payroll/dashboard" replace />} />
        <Route path="/payroll/dashboard" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><PayrollDashboardPage /></ProtectedRoute>} />
        <Route path="/payroll/global-configuration" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><GlobalConfigurationPage /></ProtectedRoute>} />
        <Route path="/payroll/statutory-deductions" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><StatutoryDeductionsPage /></ProtectedRoute>} />
        <Route path="/payroll/weekoff" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><WeekoffPage /></ProtectedRoute>} />
        <Route path="/payroll/employees" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><EmployeesPage /></ProtectedRoute>} />
        <Route path="/payroll/employees/upload-logs" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><StaffUploadLogsPage /></ProtectedRoute>} />
        <Route path="/payroll/holidays" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><HolidaysPage /></ProtectedRoute>} />
        <Route path="/payroll/holidays/upload-logs" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><HolidayUploadLogsPage /></ProtectedRoute>} />
        <Route path="/payroll/leave-configuration" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><LeaveConfigurationPage /></ProtectedRoute>} />
        <Route path="/payroll/advance-payments" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><AdvancePaymentsPage /></ProtectedRoute>} />
        <Route path="/payroll/attendance" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><AttendancePage /></ProtectedRoute>} />
        <Route path="/payroll/run" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><PayrollRunPage /></ProtectedRoute>} />
        <Route path="/payroll/payslips" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><PayslipsPage /></ProtectedRoute>} />
        <Route path="/payroll/payslips/:employeeId" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><PayslipsPage /></ProtectedRoute>} />
        <Route path="/payroll/file-configuration" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><FileConfigurationPage /></ProtectedRoute>} />
        <Route path="/payroll/reports" element={<ProtectedRoute allowedRoles={['hotel_admin', 'super_admin']}><PayrollReportsPage /></ProtectedRoute>} />
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
            <ProtectedRoute allowedRoles={STAFF_ROLES}>
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
