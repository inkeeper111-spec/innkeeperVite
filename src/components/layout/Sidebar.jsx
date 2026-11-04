import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  DoorClosed,
  Users,
  Receipt,
  Sparkles,
  UtensilsCrossed,
  Tag,
  Boxes,
  Wrench,
  DollarSign,
  UserCheck,
  Clock,
  BarChart3,
  Bot,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  Bell,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NestnnLogo } from '../ui/NestnnLogo';
import { useNotifications } from '../../contexts/NotificationContext';

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const { user, hotel, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    // Super Admin exclusive
    {
      to: '/superadmin',
      label: 'Super Admin',
      icon: ShieldCheck,
      roles: ['super_admin']
    },
    // Common & Hotel Admin
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['hotel_admin', 'super_admin']
    },
    {
      to: '/frontdesk',
      label: 'Front Desk',
      icon: Building2,
      roles: ['hotel_admin', 'receptionist', 'super_admin']
    },
    {
      to: '/reservations',
      label: 'Reservations',
      icon: CalendarDays,
      roles: ['hotel_admin', 'receptionist', 'super_admin']
    },
    {
      to: '/rooms',
      label: 'Rooms & Rates',
      icon: DoorClosed,
      roles: ['hotel_admin', 'receptionist', 'housekeeping_staff', 'super_admin']
    },
    {
      to: '/guests',
      label: 'Guest Directory',
      icon: Users,
      roles: ['hotel_admin', 'receptionist', 'super_admin']
    },
    {
      to: '/billing',
      label: 'Billing & Invoices',
      icon: Receipt,
      roles: ['hotel_admin', 'receptionist', 'super_admin']
    },
    {
      to: user?.role === 'super_admin' ? '/superadmin/modules' : '/subscription',
      label: user?.role === 'super_admin' ? 'Module Pricing' : 'Subscription',
      icon: Receipt,
      roles: ['hotel_admin', 'super_admin']
    },
    {
      to: '/housekeeping',
      label: 'Housekeeping',
      icon: Sparkles,
      roles: ['hotel_admin', 'housekeeping_staff', 'receptionist', 'super_admin']
    },
    {
      to: '/restaurant',
      label: 'Restaurant POS',
      icon: UtensilsCrossed,
      roles: ['hotel_admin', 'restaurant_staff', 'super_admin']
    },
    {
      to: '/menu-management',
      label: 'Menu Management',
      icon: Tag,
      roles: ['hotel_admin', 'restaurant_staff', 'super_admin']
    },
    {
      to: '/inventory',
      label: 'Inventory & Stock',
      icon: Boxes,
      roles: ['hotel_admin', 'restaurant_staff', 'super_admin']
    },
    {
      to: '/maintenance',
      label: 'Maintenance',
      icon: Wrench,
      roles: ['hotel_admin', 'maintenance_staff', 'housekeeping_staff', 'super_admin']
    },
    {
      to: '/expenses',
      label: 'Expenses',
      icon: DollarSign,
      roles: ['hotel_admin', 'super_admin']
    },
    {
      to: '/staff',
      label: 'Staff & Payroll',
      icon: UserCheck,
      roles: ['hotel_admin', 'super_admin']
    },
    {
      to: '/leave-management',
      label: 'Leave Management',
      icon: CalendarDays,
      roles: ['hotel_admin', 'super_admin']
    },
    {
      to: '/my-leave',
      label: 'My Leave Requests',
      icon: CalendarDays,
      roles: ['hotel_admin', 'receptionist', 'housekeeping_staff', 'restaurant_staff', 'maintenance_staff']
    },
    {
      to: '/attendance',
      label: 'My Attendance',
      icon: Clock,
      roles: ['hotel_admin', 'receptionist', 'housekeeping_staff', 'restaurant_staff', 'maintenance_staff']
    },
    {
      to: '/reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['hotel_admin', 'super_admin']
    },
    {
      to: '/ai-assistant',
      label: 'AI Revenue Intel',
      icon: Bot,
      roles: ['hotel_admin', 'super_admin']
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      roles: ['hotel_admin', 'receptionist', 'housekeeping_staff', 'restaurant_staff', 'maintenance_staff', 'super_admin']
    },
    {
      to: '/settings',
      label: 'Hotel Settings',
      icon: Settings,
      roles: ['hotel_admin']
    },
    {
      to: '/roles-responsibilities',
      label: 'Roles & Responsibilities',
      icon: KeyRound,
      roles: ['hotel_admin']
    }
  ];

  const filteredItems = navItems.filter((item) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    const moduleByPath = {
      '/frontdesk': 'frontdesk',
      '/reservations': 'reservations',
      '/rooms': 'rooms',
      '/guests': 'guests',
      '/housekeeping': 'housekeeping',
      '/restaurant': 'restaurant',
      '/menu-management': 'restaurant',
      '/inventory': 'inventory',
      '/maintenance': 'maintenance',
      '/expenses': 'expenses',
      '/staff': 'staff',
      '/leave-management': 'staff',
      '/my-leave': 'staff',
      '/attendance': 'staff',
      '/reports': 'reports',
      '/ai-assistant': 'ai_assistant'
    };
    const permissionByPath = {
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
      '/maintenance': 'maintenance.view',
      '/expenses': 'expenses.view',
      '/staff': 'staff_directory.view',
      '/leave-management': 'leave.view',
      '/my-leave': 'leave.view',
      '/attendance': 'staff_self.view',
      '/reports': 'reports.view',
      '/ai-assistant': 'ai_assistant.view',
      '/notifications': 'notifications.view',
      '/settings': 'settings.view',
      '/roles-responsibilities': 'roles_responsibilities.view'
    };
    const moduleKey = moduleByPath[item.to];
    const permissionKey = permissionByPath[item.to];
    const overrides = user.permissionOverrides || {};
    const hasOverride = permissionKey && Object.hasOwn(overrides, permissionKey);
    const hasPermission = permissionKey && user.permissions
      ? user.permissions[permissionKey] === true
      : hasOverride
        ? overrides[permissionKey]
        : item.roles.includes(user.role);
    if (!hasPermission) return false;
    const selectedModules = hotel?.currentSubscription?.selectedModules || [];
    return user.role === 'super_admin'
      || !moduleKey
      || !selectedModules.length
      || selectedModules.includes(moduleKey);
  });

  return (
    <aside
      role="dialog"
      aria-modal={isMobileOpen ? 'true' : undefined}
      aria-label="Application navigation"
      className={`fixed inset-y-0 left-0 z-40 flex h-[100dvh] w-72 transform flex-col border-r border-white/[0.08] bg-gradient-to-b from-[#352219] via-orvelle-sidebar to-[#291810] text-slate-300 shadow-[8px_0_24px_rgba(29,16,11,0.12)] transition-all duration-300 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full min-[1100px]:translate-x-0'
      } ${isCollapsed ? 'min-[1100px]:w-20' : 'min-[1100px]:w-64'}`}
    >
      {/* Brand Header */}
      <div className="h-[4.5rem] flex flex-shrink-0 items-center justify-between px-4 border-b border-white/[0.08] bg-black/20">
        <NestnnLogo size="md" dark className="overflow-hidden min-[1100px]:hidden" />
        {!isCollapsed && (
          <NestnnLogo size="md" dark className="hidden overflow-hidden min-[1100px]:block" />
        )}
        {isCollapsed && (
          <NestnnLogo size="md" variant="icon" dark className="hidden mx-auto min-[1100px]:block" />
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors min-[1100px]:block ${
            isCollapsed ? 'min-[1100px]:hidden' : ''
          }`}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="min-[1100px]:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close navigation"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
      </div>

      {/* Hotel Context Badge (if logged into tenant) */}
      {!isCollapsed && hotel && (
        <div className="border-b border-white/[0.07] bg-white/[0.03] px-4 py-3.5">
          <p className="text-[10px] uppercase font-semibold tracking-[0.16em] text-slate-400">Property</p>
          <p className="mt-1 truncate text-xs font-semibold text-white/90">{hotel.name}</p>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isNotifications = item.to === '/notifications';
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/superadmin'}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 border-l-2 px-3 py-2.5 font-medium text-sm transition-all ${
                  isActive
                    ? 'border-l-amber-300 bg-amber-400/[0.09] font-semibold text-amber-200'
                    : 'border-l-transparent text-slate-400 hover:border-l-white/30 hover:bg-white/[0.05] hover:text-white'
                } ${isCollapsed ? 'min-[1100px]:justify-center min-[1100px]:px-0' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <span className="relative flex-shrink-0">
                <Icon className="w-5 h-5" />
                {isNotifications && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className={`truncate ${isCollapsed ? 'min-[1100px]:hidden' : ''}`}>{item.label}</span>
              {(isNotifications && unreadCount > 0) && (
                <span className={`ml-auto text-[10px] font-extrabold bg-rose-500 text-white px-1.5 py-0.5 rounded-full leading-none ${isCollapsed ? 'min-[1100px]:hidden' : ''}`}>
                  {unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="border-t border-white/[0.08] bg-black/15 p-3">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'min-[1100px]:justify-center' : 'px-2 py-1.5'}`}>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 text-xs font-bold uppercase text-amber-200">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className={`flex-1 min-w-0 ${isCollapsed ? 'min-[1100px]:hidden' : ''}`}>
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 uppercase font-medium truncate">
                {user?.role?.replace(/_/g, ' ')}
              </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.07] hover:text-rose-300"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
