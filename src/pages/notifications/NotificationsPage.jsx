import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Boxes,
  CalendarDays,
  CheckCheck,
  CreditCard,
  Info,
  Sparkles,
  Wrench
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../../api/axios';
import { useNotifications } from '../../contexts/NotificationContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Select } from '../../components/ui/Select';

dayjs.extend(relativeTime);

const TYPE_META = {
  reservations: { icon: CalendarDays, color: 'bg-brand-50 text-brand-600 border-brand-200' },
  booking: { icon: CalendarDays, color: 'bg-brand-50 text-brand-600 border-brand-200' },
  housekeeping: { icon: Sparkles, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  maintenance: { icon: Wrench, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  inventory: { icon: Boxes, color: 'bg-rose-50 text-rose-600 border-rose-200' },
  billing: { icon: CreditCard, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  payments: { icon: CreditCard, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  info: { icon: Info, color: 'bg-slate-50 text-slate-600 border-slate-200' }
};

const MODULES = [
  'reservations', 'rooms', 'guests', 'expenses', 'restaurant', 'inventory',
  'housekeeping', 'maintenance', 'staff', 'leave', 'payroll', 'payments', 'platform', 'system'
];

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    module: 'all',
    priority: 'all',
    isRead: 'all',
    startDate: '',
    endDate: ''
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const loadNotifications = useCallback(async (page = pagination.page) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.set(key, value);
      });
      const response = await api.get(`/notifications?${params.toString()}`);
      if (response.data.success) {
        setNotifications(response.data.data.notifications);
        setPagination(response.data.data.pagination);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page]);

  useEffect(() => {
    loadNotifications(1);
  }, [filters]);

  const handleMarkRead = async (notification) => {
    try {
      await markAsRead(notification._id);
      setNotifications((current) => current.map((item) => (
        item._id === notification._id ? { ...item, isRead: true } : item
      )));
      await fetchNotifications();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update notification status.');
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      await markAllAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not mark notifications as read.');
    } finally {
      setMarkingRead(false);
    }
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) await handleMarkRead(notification);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
            <Bell className="h-6 w-6 text-brand-600" />
            Notifications
            {unreadCount > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">{unreadCount}</span>}
          </h1>
          <p className="mt-1 text-xs text-slate-500">Activity and alerts relevant to your role and hotel.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" icon={CheckCheck} loading={markingRead} onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </header>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select label="Module" value={filters.module} onChange={(event) => setFilters((current) => ({ ...current, module: event.target.value }))}>
            <option value="all">All modules</option>
            {MODULES.map((module) => <option key={module} value={module}>{module}</option>)}
          </Select>
          <Select label="Priority" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
            <option value="all">All priorities</option>
            {['critical', 'high', 'medium', 'low'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </Select>
          <Select label="Read status" value={filters.isRead} onChange={(event) => setFilters((current) => ({ ...current, isRead: event.target.value }))}>
            <option value="all">All statuses</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </Select>
          <Input label="From" type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
          <Input label="To" type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
        </div>
      </Card>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</div>}

      <Card>
        {loading ? <LoadingSpinner text="Loading notifications..." /> : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-slate-200" />
            <p className="text-sm font-semibold text-slate-400">No notifications found</p>
            <p className="mt-1 text-xs text-slate-400">Try adjusting your filters.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((notification) => {
              const { icon: Icon, color } = TYPE_META[notification.module || notification.type] || TYPE_META.info;
              return (
                <li key={notification._id} className={`flex items-start gap-4 px-4 py-4 ${notification.isRead ? '' : 'bg-brand-50/30'}`}>
                  <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openNotification(notification)}>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold ${notification.isRead ? 'text-slate-600' : 'text-slate-900'}`}>{notification.title}</span>
                      <span className="whitespace-nowrap text-[11px] text-slate-400">{dayjs(notification.createdAt).fromNow()}</span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{notification.message}</span>
                    <span className="mt-1 block text-[10px] font-semibold uppercase text-slate-400">
                      {notification.module || notification.type} · {notification.priority || 'medium'}
                    </span>
                  </button>
                  {!notification.isRead && (
                    <button type="button" onClick={() => handleMarkRead(notification)} className="text-xs font-semibold text-brand-600 hover:text-brand-800">
                      Mark read
                    </button>
                  )}
                  {notification.link && <span className="sr-only">Opens related page</span>}
                </li>
              );
            })}
          </ul>
        )}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>{pagination.total} notifications · Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={pagination.page <= 1 || loading} onClick={() => loadNotifications(pagination.page - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={pagination.page >= pagination.pages || loading} onClick={() => loadNotifications(pagination.page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
