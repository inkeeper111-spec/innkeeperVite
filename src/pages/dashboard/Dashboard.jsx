import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  DoorOpen,
  DoorClosed,
  CalendarCheck,
  Sparkles,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  UserCheck,
  UserMinus,
  PlusCircle,
  ArrowRight,
  Clock,
  Wrench,
  Receipt
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';

export const Dashboard = () => {
  const { hotel, user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Aggregating operational analytics..." />;
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
        <p className="font-semibold text-sm">Failed to load dashboard</p>
        <p className="text-xs mt-1">{error}</p>
        <Button size="sm" variant="danger" className="mt-3" onClick={fetchDashboard}>
          Retry
        </Button>
      </div>
    );
  }

  const currencySymbol = hotel?.currency === 'EUR' ? '€' : hotel?.currency === 'GBP' ? '£' : hotel?.currency === 'INR' ? '₹' : '$';

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-orvelle-primary p-6 rounded-2xl text-white shadow-lg">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block mb-1">
            Operational Command Center
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {hotel?.name} • Live Property Status • {dayjs().format('dddd, MMMM D, YYYY')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="gold"
            icon={PlusCircle}
            onClick={() => navigate('/reservations')}
          >
            New Booking
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            icon={UserCheck}
            onClick={() => navigate('/frontdesk')}
          >
            Front Desk
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            icon={Sparkles}
            onClick={() => navigate('/housekeeping')}
          >
            Housekeeping
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total & Available Rooms */}
        <Card className="hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Available Rooms
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DoorOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {data.availableRooms}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ {data.totalRooms} Total</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Ready for guest check-in</span>
          </div>
        </Card>

        {/* Occupancy Rate */}
        <Card className="hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Current Occupancy
            </span>
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {data.occupancyRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">({data.occupiedRooms} Occupied)</span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-brand-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, data.occupancyRate)}%` }}
            />
          </div>
        </Card>

        {/* Revenue This Month */}
        <Card className="hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Month Revenue
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {currencySymbol}{data.monthlyRevenue.toLocaleString()}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Today: <span className="font-semibold text-slate-800">{currencySymbol}{data.todayRevenue.toLocaleString()}</span>
          </p>
        </Card>

        {/* Pending Payments */}
        <Card className="hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Folio Balance
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {currencySymbol}{data.pendingPayments.toLocaleString()}
            </span>
          </div>
          <p className="mt-3 text-xs text-rose-600 font-medium">
            Outstanding receivables
          </p>
        </Card>
      </div>

      {/* Daily Movements & Quick Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Arrivals Today</p>
            <p className="text-xl font-bold text-slate-900">{data.todayArrivals}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Departures Today</p>
            <p className="text-xl font-bold text-slate-900">{data.todayDepartures}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Bookings</p>
            <p className="text-xl font-bold text-slate-900">{data.activeReservations}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Rooms To Clean</p>
            <p className="text-xl font-bold text-slate-900">{data.dirtyRooms}</p>
          </div>
        </div>
      </div>

      {/* Revenue & Bookings Trend Chart */}
      <Card
        title="7-Day Revenue & Demand Trend"
        subtitle="Daily payment receipts and booking volumes"
        action={
          <Button size="sm" variant="outline" onClick={() => navigate('/reports')}>
            View Reports
          </Button>
        }
      >
        <div className="h-72 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b77ab" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b77ab" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${currencySymbol}${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                formatter={(val) => [`${currencySymbol}${val}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#2c5e8d" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Bottom Grid: Recent Bookings & Operational Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings (2 cols) */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Reservations"
            subtitle="Latest bookings made across channels"
            action={
              <button
                onClick={() => navigate('/reservations')}
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="pb-3">Reference</th>
                    <th className="pb-3">Guest</th>
                    <th className="pb-3">Check-In</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentBookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No bookings found.
                      </td>
                    </tr>
                  ) : (
                    data.recentBookings.map((b) => (
                      <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-semibold text-slate-900">{b.bookingReference}</td>
                        <td className="py-3 font-medium text-slate-700">{b.guestName}</td>
                        <td className="py-3 text-slate-500">{dayjs(b.checkInDate).format('MMM D, YYYY')}</td>
                        <td className="py-3">
                          <Badge variant={b.status}>{b.status}</Badge>
                        </td>
                        <td className="py-3 text-right font-bold text-slate-900">
                          {currencySymbol}{b.totalAmount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Operational Alerts (1 col) */}
        <div className="space-y-4">
          {/* Housekeeping Queue Alert */}
          <Card
            title="Housekeeping Queue"
            subtitle={`${data.housekeepingAlerts.length} rooms awaiting attention`}
            action={
              <button
                onClick={() => navigate('/housekeeping')}
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
              >
                Open
              </button>
            }
          >
            <div className="space-y-2.5">
              {data.housekeepingAlerts.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">All rooms are inspected and clean.</p>
              ) : (
                data.housekeepingAlerts.map((task) => (
                  <div
                    key={task._id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Room {task.roomId?.roomNumber || 'Room'}
                      </p>
                      <p className="text-[10px] text-slate-500">Floor {task.roomId?.floor || '1'}</p>
                    </div>
                    <Badge variant={task.status}>{task.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Maintenance Alerts */}
          <Card
            title="Active Maintenance"
            subtitle="Tickets in progress"
            action={
              <button
                onClick={() => navigate('/maintenance')}
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
              >
                View
              </button>
            }
          >
            <div className="space-y-2.5">
              {data.maintenanceAlerts.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No open maintenance issues.</p>
              ) : (
                data.maintenanceAlerts.map((t) => (
                  <div
                    key={t._id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{t.ticketNumber}</p>
                      <p className="text-[10px] text-slate-500 truncate">{t.issueDescription}</p>
                    </div>
                    <Badge variant={t.priority}>{t.priority}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

