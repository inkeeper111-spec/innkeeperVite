import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  ArrowLeftRight,
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
  ChevronDown,
  LogOut,
  Building2,
  Bell,
  KeyRound,
  ConciergeBell,
  CookingPot,
  HardHat,
  UsersRound,
  SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NestnnLogo } from '../ui/NestnnLogo';
import { useNotifications } from '../../contexts/NotificationContext';

/* ───────────────────── nav structure ───────────────────── */

const navGroups = [
  {
    key: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['hotel_admin', 'super_admin'] },
      { to: '/reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['hotel_admin', 'super_admin'] },
      { to: '/ai-assistant', label: 'AI Revenue Intel', icon: Bot, roles: ['hotel_admin', 'super_admin'] },
    ],
  },
  {
    key: 'front-office',
    label: 'Front Office',
    icon: ConciergeBell,
    items: [
      { to: '/frontdesk', label: 'Front Desk', icon: Building2, roles: ['hotel_admin', 'receptionist', 'super_admin'] },
      { to: '/reservations', label: 'Reservations', icon: CalendarDays, roles: ['hotel_admin', 'receptionist', 'super_admin'] },
      { to: '/rooms', label: 'Rooms & Rates', icon: DoorClosed, roles: ['hotel_admin', 'receptionist', 'housekeeping_staff', 'super_admin'] },
      { to: '/guests', label: 'Guest Directory', icon: Users, roles: ['hotel_admin', 'receptionist', 'super_admin'] },
      { to: '/billing', label: 'Billing & Invoices', icon: Receipt, roles: ['hotel_admin', 'receptionist', 'super_admin'] },
    ],
  },
  {
    key: 'fnb',
    label: 'Food & Beverage',
    icon: CookingPot,
    items: [
      { to: '/restaurant', label: 'Restaurant POS', icon: UtensilsCrossed, roles: ['hotel_admin', 'restaurant_staff', 'super_admin'] },
      { to: '/menu-management', label: 'Menu Management', icon: Tag, roles: ['hotel_admin', 'restaurant_staff', 'super_admin'] },
    ],
  },
  {
    key: 'inventory',
    label: 'Raw Material Inventory',
    icon: Boxes,
    items: [
      { to: '/inventory/dashboard', label: 'Inventory Dashboard', icon: LayoutDashboard, roles: ['hotel_admin', 'restaurant_staff', 'housekeeping_staff', 'maintenance_staff', 'super_admin'] },
      { to: '/inventory/raw-materials', label: 'Raw Materials', icon: Boxes, roles: ['hotel_admin', 'restaurant_staff', 'housekeeping_staff', 'maintenance_staff', 'super_admin'] },
      { to: '/inventory/stock', label: 'Stock & Verification', icon: ArrowLeftRight, roles: ['hotel_admin', 'restaurant_staff', 'housekeeping_staff', 'maintenance_staff', 'super_admin'] },
      { to: '/inventory/recipes', label: 'Recipe Management', icon: UtensilsCrossed, roles: ['hotel_admin', 'restaurant_staff', 'super_admin'] },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    icon: HardHat,
    items: [
      { to: '/housekeeping', label: 'Housekeeping', icon: Sparkles, roles: ['hotel_admin', 'housekeeping_staff', 'receptionist', 'super_admin'] },
      { to: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['hotel_admin', 'maintenance_staff', 'housekeeping_staff', 'super_admin'] },
      { to: '/expenses', label: 'Expenses', icon: DollarSign, roles: ['hotel_admin', 'super_admin'] },
    ],
  },
  {
    key: 'staff',
    label: 'Staff',
    icon: UsersRound,
    items: [
      { to: '/staff', label: 'Staff & Payroll', icon: UserCheck, roles: ['hotel_admin', 'super_admin'] },
      { to: '/leave-management', label: 'Leave Management', icon: CalendarDays, roles: ['hotel_admin', 'super_admin'] },
      { to: '/my-leave', label: 'My Leave Requests', icon: CalendarDays, roles: ['hotel_admin', 'receptionist', 'housekeeping_staff', 'restaurant_staff', 'maintenance_staff'] },
      { to: '/attendance', label: 'My Attendance', icon: Clock, roles: ['hotel_admin', 'receptionist', 'housekeeping_staff', 'restaurant_staff', 'maintenance_staff'] },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: SlidersHorizontal,
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['hotel_admin', 'receptionist', 'housekeeping_staff', 'restaurant_staff', 'maintenance_staff', 'super_admin'] },
      { to: '/settings', label: 'Hotel Settings', icon: Settings, roles: ['hotel_admin'] },
      { to: '/roles-responsibilities', label: 'Roles & Access', icon: KeyRound, roles: ['hotel_admin'] },
    ],
  },
];

/* standalone items shown above the groups */
const standaloneItems = [
  { to: '/superadmin', label: 'Super Admin', icon: ShieldCheck, roles: ['super_admin'] },
];

/* subscription item (rendered inside Settings group or standalone depending on role) */
const subscriptionItem = (user) => ({
  to: user?.role === 'super_admin' ? '/superadmin/modules' : '/subscription',
  label: user?.role === 'super_admin' ? 'Module Pricing' : 'Subscription',
  icon: Receipt,
  roles: ['hotel_admin', 'super_admin'],
});

/* ───────────────────── helpers ───────────────────── */

const moduleByPath = {
  '/frontdesk': 'frontdesk',
  '/reservations': 'reservations',
  '/rooms': 'rooms',
  '/guests': 'guests',
  '/housekeeping': 'housekeeping',
  '/restaurant': 'restaurant',
  '/menu-management': 'restaurant',
  '/inventory': 'inventory',
  '/inventory/dashboard': 'inventory',
  '/inventory/categories': 'inventory',
  '/inventory/items': 'inventory',
  '/inventory/stock': 'inventory',
  '/inventory/raw-materials': 'inventory',
  '/inventory/raw-material-categories': 'inventory',
  '/inventory/recipes': 'inventory',
  '/maintenance': 'maintenance',
  '/expenses': 'expenses',
  '/staff': 'staff',
  '/leave-management': 'staff',
  '/my-leave': 'staff',
  '/attendance': 'staff',
  '/reports': 'reports',
  '/ai-assistant': 'ai_assistant',
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
  '/leave-management': 'leave.view',
  '/my-leave': 'leave.view',
  '/attendance': 'staff_self.view',
  '/reports': 'reports.view',
  '/ai-assistant': 'ai_assistant.view',
  '/notifications': 'notifications.view',
  '/settings': 'settings.view',
  '/roles-responsibilities': 'roles_responsibilities.view',
};

function canSeeItem(item, user, hotel) {
  if (!user) return false;
  if (user.role === 'super_admin') return true;

  const overrides = user.permissionOverrides || {};
  const permKey = permissionByPath[item.to];
  const hasOverride = permKey && Object.hasOwn(overrides, permKey);
  const hasPermission = permKey && user.permissions
    ? user.permissions[permKey] === true
    : hasOverride
      ? overrides[permKey]
      : item.roles.includes(user.role);
  if (!hasPermission) return false;

  const modKey = moduleByPath[item.to];
  const selectedModules = hotel?.currentSubscription?.selectedModules || [];
  return !modKey || !selectedModules.length || selectedModules.includes(modKey);
}

function isNavItemActive(pathname, item) {
  return pathname.startsWith(item.to)
    || (item.to === '/inventory/raw-materials' && pathname === '/inventory/raw-material-categories');
}

function findGroupForPath(pathname) {
  for (const group of navGroups) {
    if (group.items.some((item) => isNavItemActive(pathname, item))) {
      return group.key;
    }
  }
  return null;
}

/* ───────────────────── component ───────────────────── */

export const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const { user, hotel, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();

  /* which group is open */
  const [expandedGroup, setExpandedGroup] = useState(() => findGroupForPath(location.pathname));

  /* auto-expand the group that contains the active route */
  useEffect(() => {
    const group = findGroupForPath(location.pathname);
    if (group) setExpandedGroup(group);
  }, [location.pathname]);

  const toggleGroup = useCallback((key) => {
    setExpandedGroup((prev) => (prev === key ? null : key));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  /* build the subscription item with the correct path based on role */
  const subItem = subscriptionItem(user);

  /* add subscription to the settings group's items for rendering */
  const resolvedGroups = navGroups.map((group) => {
    if (group.key === 'settings') {
      return { ...group, items: [subItem, ...group.items] };
    }
    return group;
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

      {/* Hotel Context Badge */}
      {!isCollapsed && hotel && (
        <div className="border-b border-white/[0.07] bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] uppercase font-semibold tracking-[0.16em] text-slate-400">Property</p>
          <p className="mt-0.5 truncate text-xs font-semibold text-white/90">{hotel.name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'none' }}>
        {/* Standalone items (e.g. Super Admin) */}
        {standaloneItems
          .filter((item) => canSeeItem(item, user, hotel))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-amber-400/[0.12] font-semibold text-amber-200'
                      : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                  } ${isCollapsed ? 'min-[1100px]:justify-center min-[1100px]:px-0' : ''}`
                }
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className={`truncate ${isCollapsed ? 'min-[1100px]:hidden' : ''}`}>{item.label}</span>
              </NavLink>
            );
          })}

        {/* Grouped sections */}
        <div className="space-y-0.5">
          {resolvedGroups.map((group) => {
            const visibleItems = group.items.filter((item) => canSeeItem(item, user, hotel));
            if (!visibleItems.length) return null;

            const GroupIcon = group.icon;
            const isExpanded = expandedGroup === group.key;
            const hasActiveChild = visibleItems.some((item) => location.pathname.startsWith(item.to));

            return (
              <div key={group.key}>
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                    hasActiveChild && !isExpanded
                      ? 'text-amber-200 bg-amber-400/[0.07]'
                      : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                  } ${isCollapsed ? 'min-[1100px]:justify-center min-[1100px]:px-0' : ''}`}
                  title={isCollapsed ? group.label : undefined}
                >
                  <GroupIcon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className={`flex-1 truncate text-left ${isCollapsed ? 'min-[1100px]:hidden' : ''}`}>
                    {group.label}
                  </span>
                  {/* notification badge on the group header when collapsed */}
                  {group.key === 'settings' && unreadCount > 0 && !isExpanded && (
                    <span className={`ml-auto text-[9px] font-extrabold bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center leading-none ${isCollapsed ? 'min-[1100px]:absolute min-[1100px]:-top-1 min-[1100px]:-right-1' : ''}`}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 flex-shrink-0 text-slate-500 transition-transform duration-200 ${
                      isExpanded ? 'rotate-0' : '-rotate-90'
                    } ${isCollapsed ? 'min-[1100px]:hidden' : ''}`}
                  />
                </button>

                {/* Group children — expand/collapse */}
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                  } ${isCollapsed ? 'min-[1100px]:max-h-0 min-[1100px]:opacity-0' : ''}`}
                >
                  <div className={`ml-3 border-l border-white/[0.08] pl-2.5 py-0.5 space-y-px`}>
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isNotifications = item.to === '/notifications';
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setIsMobileOpen(false)}
                          className={({ isActive }) =>
                            `group flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] font-medium transition-all ${
                              isActive || isNavItemActive(location.pathname, item)
                                ? 'bg-amber-400/[0.10] font-semibold text-amber-200'
                                : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                            }`
                          }
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {isNotifications && unreadCount > 0 && (
                            <span className="ml-auto text-[9px] font-extrabold bg-rose-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                              {unreadCount}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer Profile & Logout */}
      <div className="border-t border-white/[0.08] bg-black/15 p-3">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'min-[1100px]:justify-center' : 'px-2 py-1'}`}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 text-[11px] font-bold uppercase text-amber-200">
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
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.07] hover:text-rose-300"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
