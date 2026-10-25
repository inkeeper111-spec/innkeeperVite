import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  Bell,
  CheckCheck,
  CalendarDays,
  Sparkles,
  Wrench,
  Boxes,
  CreditCard,
  Info,
  AlertTriangle
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const TYPE_META = {
  booking:     { icon: CalendarDays, color: 'bg-brand-50 text-brand-600 border-brand-200' },
  housekeeping:{ icon: Sparkles,     color: 'bg-purple-50 text-purple-600 border-purple-200' },
  maintenance: { icon: Wrench,       color: 'bg-amber-50 text-amber-600 border-amber-200' },
  inventory:   { icon: Boxes,        color: 'bg-rose-50 text-rose-600 border-rose-200' },
  billing:     { icon: CreditCard,   color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  info:        { icon: Info,         color: 'bg-slate-50 text-slate-600 border-slate-200' },
};

const getMeta = (type) => TYPE_META[type] || TYPE_META.info;

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [markingRead, setMarkingRead]     = useState(false);
  const [typeFilter, setTypeFilter]       = useState('all');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    setMarkingRead(true);
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark notifications as read:', e);
    } finally {
      setMarkingRead(false);
    }
  };

  const types = ['all', ...Array.from(new Set(notifications.map((n) => n.type)))];

  const filtered = typeFilter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === typeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-600" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            System-wide alerts for bookings, housekeeping, maintenance, inventory, and billing
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            icon={CheckCheck}
            loading={markingRead}
            onClick={handleMarkAllRead}
          >
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200/80">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
              typeFilter === t
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t === 'all' ? 'All Types' : t}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <Card>
        {loading ? (
          <LoadingSpinner text="Loading notifications..." />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">No notifications yet</p>
            <p className="text-xs text-slate-400 mt-1">Operational alerts will appear here as they occur.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((n) => {
              const { icon: Icon, color } = getMeta(n.type);
              return (
                <li
                  key={n._id}
                  className={`flex items-start gap-4 px-4 py-4 transition-colors hover:bg-slate-50 ${
                    !n.isRead ? 'bg-brand-50/30' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold leading-snug ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                        )}
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {dayjs(n.createdAt).fromNow()}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                    {n.link && (
                      <a
                        href={n.link}
                        className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 mt-1 inline-block"
                      >
                        View details →
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Stats summary */}
      {!loading && notifications.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(TYPE_META).map(([type, { icon: Icon, color }]) => {
            const count = notifications.filter((n) => n.type === type).length;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center gap-3 hover:border-slate-300 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 capitalize">{type}</p>
                  <p className="text-lg font-black text-slate-900">{count}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
