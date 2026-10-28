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
  Bell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { InnkeeperLogo } from '../ui/InnkeeperLogo';
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
    }
  ];

  const filteredItems = navItems.filter((item) => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  return (
    <aside
      role="dialog"
      aria-modal={isMobileOpen ? 'true' : undefined}
      aria-label="Application navigation"
      className={`fixed top-0 left-0 z-40 h-screen bg-orvelle-sidebar text-slate-300 transition-all duration-300 flex flex-col border-r border-orvelle-dark transform ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } ${isCollapsed ? 'md:w-20' : 'w-72 md:w-64'}`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 bg-black/30">
        <InnkeeperLogo size="sm" dark className="overflow-hidden md:hidden" />
        {!isCollapsed && (
          <InnkeeperLogo size="sm" dark className="hidden overflow-hidden md:block" />
        )}
        {isCollapsed && (
          <InnkeeperLogo size="sm" variant="icon" dark className="hidden mx-auto md:block" />
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors md:block ${
            isCollapsed ? 'md:hidden' : ''
          }`}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close navigation"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
      </div>

      {/* Hotel Context Badge (if logged into tenant) */}
      {!isCollapsed && hotel && (
        <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-800/30">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Property</p>
          <p className="text-xs font-semibold text-slate-100 truncate mt-0.5">{hotel.name}</p>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isNotifications = item.to === '/notifications';
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                  isActive
                    ? 'bg-amber-700/30 text-amber-300 border border-amber-600/40 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                } ${isCollapsed ? 'md:justify-center md:px-0' : ''}`
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
              <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
              {(isNotifications && unreadCount > 0) && (
                <span className={`ml-auto text-[10px] font-extrabold bg-rose-500 text-white px-1.5 py-0.5 rounded-full leading-none ${isCollapsed ? 'md:hidden' : ''}`}>
                  {unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center' : 'px-2 py-1.5'}`}>
          <div className="w-8 h-8 rounded-full bg-brand-700/60 text-brand-200 border border-brand-500/30 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className={`flex-1 min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 uppercase font-medium truncate">
                {user?.role?.replace(/_/g, ' ')}
              </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
