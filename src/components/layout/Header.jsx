import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  LogOut,
  Settings,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const Header = ({ isCollapsed, setIsCollapsed, setIsMobileOpen }) => {
  const { user, hotel, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef(null);
  const userRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) await markAsRead(notification._id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
    if (notification.link) navigate(notification.link);
    setShowNotifications(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  return (
    <header className="h-16 min-w-0 bg-white border-b border-orvelle-border/80 sticky top-0 z-20 px-3 sm:px-5 flex items-center justify-between gap-2">
      {/* Left controls */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          onClick={() => {
            if (window.matchMedia('(min-width: 768px)').matches) {
              setIsCollapsed(!isCollapsed);
            } else {
              setIsMobileOpen(true);
            }
          }}
          className="p-2 text-orvelle-muted hover:text-orvelle-primary hover:bg-orvelle-cream rounded-lg transition-colors"
          aria-label="Toggle sidebar"
          aria-expanded={window.matchMedia('(min-width: 768px)').matches ? !isCollapsed : undefined}
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {hotel && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-orvelle-cream/80 border border-orvelle-border/60 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-orvelle-success animate-pulse" />
            <span className="text-xs font-semibold text-orvelle-primary">{hotel.name}</span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-orvelle-champagneLight text-orvelle-primary">
              {hotel.currency}
            </span>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="fixed inset-x-3 top-14 mt-2 max-h-[calc(100dvh-4.25rem)] max-w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-96">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800 text-sm">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${
                        !n.isRead ? 'bg-brand-50/30' : ''
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 mt-0.5 flex-shrink-0">
                        {n.type === 'inventory' ? (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-brand-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{n.title}</p>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {dayjs(n.createdAt).fromNow()}
                        </span>
                        <span className={`mt-1 inline-block text-[9px] font-bold uppercase ${n.priority === 'critical' ? 'text-rose-700' : n.priority === 'high' ? 'text-amber-700' : 'text-slate-400'}`}>
                          {n.module || n.type} · {n.priority || 'medium'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-slate-100 p-3 text-center">
                <button
                  onClick={() => {
                    navigate('/notifications');
                    setShowNotifications(false);
                  }}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden lg:block text-left text-xs leading-tight">
              <p className="font-semibold text-slate-800">{user?.name}</p>
              <p className="text-slate-400 capitalize text-[10px]">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 capitalize">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Profile & Settings</span>
                </button>
              </div>

              <div className="border-t border-slate-100 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
