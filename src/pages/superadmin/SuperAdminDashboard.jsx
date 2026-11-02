import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  ShieldCheck, Building2, Users, CreditCard, CheckCircle, XCircle,
  FileText, Search, CheckCircle2, TrendingUp, Globe, AlertCircle,
  PlusCircle, Pencil, RefreshCcw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';

export const SuperAdminDashboard = () => {
  const [stats,        setStats]        = useState(null);
  const [hotels,       setHotels]       = useState([]);
  const [plans,        setPlans]        = useState([]);
  const [subscriptions,setSubscriptions]= useState([]);
  const [moduleConfigs, setModuleConfigs] = useState([]);
  const [minimumMonthlyAmount, setMinimumMonthlyAmount] = useState('999');
  const [auditLogs,    setAuditLogs]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState('approvals');
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [message,      setMessage]      = useState('');

  // Plan assignment modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedHotel,   setSelectedHotel]   = useState(null);
  const [planAssignForm,  setPlanAssignForm]   = useState({ planId: '', billingCycle: 'monthly' });

  // Create Plan modal
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [detailsHotel, setDetailsHotel] = useState(null);
  const [moduleSubscribers, setModuleSubscribers] = useState(null);
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [newPlanForm,   setNewPlanForm]   = useState({
    name: '', code: '', description: '', monthlyPrice: '',
    annualPrice: '', maxRooms: 50, maxUsers: 10,
    maxProperties: 1, supportLevel: 'standard',
    aiUsageAllowance: 0,
    enabledModules: 'rooms,reservations,guests,frontdesk,billing,housekeeping,restaurant,inventory,expenses,maintenance,reports'
  });

  const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [statsRes, hotelsRes, plansRes, subsRes, logsRes, modulesRes] = await Promise.all([
        api.get('/superadmin/stats'),
        api.get('/superadmin/hotels?limit=50'),
        api.get('/superadmin/plans'),
        api.get('/superadmin/subscriptions?limit=100'),
        api.get('/superadmin/audit-logs?limit=30'),
        api.get('/superadmin/modules')
      ]);
      if (statsRes.data.success)        setStats(statsRes.data.data);
      if (hotelsRes.data.success)       setHotels(hotelsRes.data.data.hotels);
      if (plansRes.data.success)        setPlans(plansRes.data.data);
      if (subsRes.data.success)         setSubscriptions(subsRes.data.data.subscriptions);
      if (logsRes.data.success)         setAuditLogs(logsRes.data.data.logs);
      if (modulesRes.data.success) {
        setModuleConfigs(modulesRes.data.data.modules);
        setMinimumMonthlyAmount(String(modulesRes.data.data.settings.minimumMonthlyAmount));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleUpdateStatus = async (hotelId, newStatus, rejectionReason = '') => {
    try {
      const payload = { status: newStatus };
      if (rejectionReason) payload.rejectionReason = rejectionReason;
      const res = await api.patch(`/superadmin/hotels/${hotelId}/status`, payload);
      if (res.data.success) {
        showMessage(res.data.message);
        fetchAll();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed.');
    }
  };

  const handleReject = async (hotel) => {
    const reason = prompt(`Enter rejection reason for "${hotel.name}":`, 'Does not meet platform requirements.');
    if (!reason) return;
    await handleUpdateStatus(hotel._id, 'rejected', reason);
  };

  const handleOpenPlanAssign = (hotel) => {
    setSelectedHotel(hotel);
    setPlanAssignForm({ planId: hotel.currentPlanId?._id || plans[0]?._id || '', billingCycle: 'monthly' });
    setIsPlanModalOpen(true);
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch(`/superadmin/hotels/${selectedHotel._id}/plan`, planAssignForm);
      if (res.data.success) {
        setIsPlanModalOpen(false);
        showMessage(res.data.message);
        fetchAll();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Plan assignment failed.');
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      const modules = newPlanForm.enabledModules.split(',').map(m => m.trim()).filter(Boolean);
      const res = await api.post('/superadmin/plans', { ...newPlanForm, enabledModules: modules });
      if (res.data.success) {
        setIsNewPlanOpen(false);
        showMessage(`Plan "${newPlanForm.name}" created.`);
        fetchAll();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create plan.');
    }
  };

  const saveMinimumAmount = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/superadmin/subscription-settings', { minimumMonthlyAmount: Number(minimumMonthlyAmount) });
      setMinimumMonthlyAmount(String(res.data.data.minimumMonthlyAmount));
      showMessage(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update the minimum subscription amount.');
    }
  };

  const saveModule = async (module) => {
    try {
      const res = await api.put(`/superadmin/modules/${module.key}`, {
        name: module.name,
        description: module.description,
        monthlyPrice: Number(module.monthlyPrice),
        annualPrice: Number(module.annualPrice),
        enabled: module.enabled
      });
      setModuleConfigs((previous) => previous.map((item) => item.key === module.key ? res.data.data : item));
      showMessage(`${module.name} pricing updated.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update module configuration.');
    }
  };

  const viewModuleSubscribers = async (module) => {
    try {
      const res = await api.get(`/superadmin/modules/${module.key}/hotels`);
      setModuleSubscribers(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to load hotels subscribed to this module.');
    }
  };

  const manageSubscription = async (subscription, action) => {
    const days = action === 'extend' ? prompt('Number of days to extend:', '30') : undefined;
    if (action === 'extend' && (!days || !Number.isInteger(Number(days)))) return;
    try {
      const res = await api.patch(`/superadmin/subscriptions/${subscription._id}/manage`, { action, days: Number(days) });
      showMessage(res.data.message);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || `Unable to ${action} subscription.`);
    }
  };

  const filteredHotels = hotels.filter((h) => {
    const matchSearch = h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.email.toLowerCase().includes(search.toLowerCase()) ||
      (h.city || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || h.status === statusFilter;
    return matchSearch && matchStatus;
  });
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const endDate = subscription.endDate ? dayjs(subscription.endDate) : null;
    const isExpired = subscription.status === 'expired' || (endDate && endDate.isBefore(dayjs()));
    if (subscriptionFilter === 'expired') return isExpired;
    if (subscriptionFilter === 'upcoming') {
      return !isExpired && endDate && endDate.isBefore(dayjs().add(30, 'day'));
    }
    if (subscriptionFilter === 'active') return subscription.status === 'active' && !isExpired;
    if (subscriptionFilter === 'suspended') return subscription.status === 'suspended';
    return true;
  });

  if (loading) return <LoadingSpinner text="Connecting to Platform Control Layer..." />;

  return (
    <div className="space-y-6">
      {/* Platform Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-600 rounded-2xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Super Admin Platform Console</h1>
            <p className="text-xs text-slate-400 mt-0.5">Multi-tenant SaaS oversight · Hotel approvals · Subscription management</p>
          </div>
        </div>
        <Button size="sm" variant="outline"
          className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          icon={RefreshCcw} onClick={fetchAll}>
          Refresh
        </Button>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          {message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Total Hotels</span>
            <Globe className="w-5 h-5 text-brand-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{stats?.totalHotels}</p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">{stats?.activeHotels} Active</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Pending Approval</span>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-600 mt-2">{stats?.pendingHotels}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting verification</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Platform Users</span>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{stats?.totalUsers}</p>
          <p className="text-xs text-slate-500 mt-1">{stats?.totalBookings} total bookings</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">SaaS Revenue</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-brand-600 mt-2">${stats?.platformRevenue?.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Active subscriptions</p>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      {stats?.monthlyTrend?.length > 0 && (
        <Card title="Platform Revenue Trend (6 Months)" subtitle="Monthly payment collections across all hotels">
          <div className="h-52 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b77ab" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b77ab" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  formatter={(val) => [`$${val}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2c5e8d" strokeWidth={2.5} fillOpacity={1} fill="url(#adminRevenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-0">
        {[
          { key: 'approvals',     label: `Hotels (${hotels.length})`,          icon: Building2 },
          { key: 'modules',       label: `Modules (${moduleConfigs.length})`,   icon: CreditCard },
          { key: 'plans',         label: `Plans (${plans.length})`,             icon: CreditCard },
          { key: 'subscriptions', label: `Subscriptions (${subscriptions.length})`, icon: TrendingUp },
          { key: 'audit',         label: 'Audit Trail',                         icon: FileText }
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`py-3 px-5 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── HOTELS TAB ── */}
      {activeTab === 'approvals' && (
        <Card>
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search hotel, city, email..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
              />
            </div>
            <Select
              size="sm"
              className="max-w-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'pending_approval', label: 'Pending Approval' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'rejected', label: 'Rejected' }
              ]}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Hotel</th>
                  <th className="pb-3">Owner</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Registered</th>
                  <th className="pb-3">Registration</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHotels.map((h) => (
                  <tr key={h._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5">
                      <p className="font-bold text-slate-900">{h.name}</p>
                      <p className="text-[11px] text-slate-400">{h.email}</p>
                    </td>
                    <td className="py-3.5">
                      <p className="font-semibold text-slate-800">{h.ownerId?.name || '—'}</p>
                      <p className="text-[11px] text-slate-400">{h.ownerId?.phone || ''}</p>
                    </td>
                    <td className="py-3.5 text-slate-600">{h.city}, {h.country}</td>
                    <td className="py-3.5">
                      {dayjs(h.createdAt).format('MMM D, YYYY')}
                    </td>
                    <td className="py-3.5"><Badge variant={h.registrationStatus || h.status}>{(h.registrationStatus || h.status).replace(/_/g, ' ')}</Badge></td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setDetailsHotel(h)}>View Details</Button>
                        {(h.registrationStatus || h.status) === 'pending' || h.status === 'pending_approval' ? (
                          <>
                            <Button size="sm" variant="success" icon={CheckCircle}
                              onClick={() => handleUpdateStatus(h._id, 'active')}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => handleReject(h)}>Reject</Button>
                          </>
                        ) : (h.registrationStatus || h.status) === 'approved' && h.status !== 'suspended' ? (
                          <Button size="sm" variant="danger" icon={XCircle}
                            onClick={() => handleUpdateStatus(h._id, 'suspended')}>Suspend</Button>
                        ) : h.status === 'suspended' ? (
                          <Button size="sm" variant="success" onClick={() => handleUpdateStatus(h._id, 'active')}>Reactivate</Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── MODULE PRICING TAB ── */}
      {activeTab === 'modules' && (
        <div className="space-y-5">
          <Card>
            <form onSubmit={saveMinimumAmount} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="max-w-xs flex-1">
                <Input label="Minimum monthly subscription (₹)" type="number" min="999" step="0.01"
                  value={minimumMonthlyAmount}
                  onChange={(event) => setMinimumMonthlyAmount(event.target.value)} />
              </div>
              <Button type="submit">Save minimum</Button>
              <p className="text-xs text-slate-500">The final amount is the greater of this minimum (×12 for annual) and the selected module total.</p>
            </form>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            {moduleConfigs.map((module) => (
              <Card key={module.key} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{module.name}</h3>
                    <p className="text-xs text-slate-500">{module.key}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input type="checkbox" checked={module.enabled}
                      onChange={(event) => setModuleConfigs((previous) => previous.map((item) => item.key === module.key ? { ...item, enabled: event.target.checked } : item))} />
                    Available for subscription
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Monthly price (₹)" type="number" min="0" step="0.01" value={module.monthlyPrice}
                    onChange={(event) => setModuleConfigs((previous) => previous.map((item) => item.key === module.key ? { ...item, monthlyPrice: event.target.value } : item))} />
                  <Input label="Annual price (₹)" type="number" min="0" step="0.01" value={module.annualPrice}
                    onChange={(event) => setModuleConfigs((previous) => previous.map((item) => item.key === module.key ? { ...item, annualPrice: event.target.value } : item))} />
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <Button size="sm" variant="outline" onClick={() => viewModuleSubscribers(module)}>Hotels subscribed</Button>
                  <Button size="sm" onClick={() => saveModule(module)}>Save module</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── PLANS TAB ── */}
      {activeTab === 'plans' && (
        <>
          <div className="flex justify-end">
            <Button variant="primary" icon={PlusCircle} size="sm" onClick={() => setIsNewPlanOpen(true)}>
              Create Plan
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => (
              <Card key={p._id} className="border-2 hover:border-brand-500 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-brand-600 tracking-wider">
                        {p.code}
                      </span>
                      <h3 className="font-black text-slate-900 text-lg mt-0.5">{p.name}</h3>
                    </div>
                    <span className="text-2xl font-black text-slate-900">${p.monthlyPrice}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{p.description}</p>
                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <p>Rooms: <span className="font-bold">{p.maxRooms}</span> · Users: <span className="font-bold">{p.maxUsers}</span></p>
                    <p>Annual: <span className="font-bold">${p.annualPrice}</span> · AI: <span className="font-bold">{p.aiUsageAllowance} calls</span></p>
                    <p>Support: <span className="font-bold capitalize">{p.supportLevel?.replace(/_/g, ' ')}</span></p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── SUBSCRIPTIONS TAB ── */}
      {activeTab === 'subscriptions' && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Review payment history, upcoming renewals, and expired hotel subscriptions.</p>
            <Select size="sm" className="max-w-xs" value={subscriptionFilter}
              onChange={(event) => setSubscriptionFilter(event.target.value)}
              options={[
                { value: 'all', label: 'All subscriptions' },
                { value: 'active', label: 'Active' },
                { value: 'upcoming', label: 'Upcoming renewals (30 days)' },
                { value: 'expired', label: 'Expired' },
                { value: 'suspended', label: 'Suspended' }
              ]} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Hotel</th>
                  <th className="pb-3">Subscribed Modules</th>
                  <th className="pb-3">Cycle</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Next renewal</th>
                  <th className="pb-3">Payments</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubscriptions.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-slate-900">{s.hotelId?.name || '—'}</td>
                    <td className="max-w-xs py-3 text-slate-600">{s.selectedModules?.length ? s.selectedModules.join(', ') : s.planId?.name || 'Legacy plan'}</td>
                    <td className="py-3 capitalize text-slate-600">{s.billingCycle}</td>
                    <td className="py-3 font-black text-slate-900">{s.currency === 'INR' ? '₹' : '$'}{s.finalAmount || s.amount}</td>
                    <td className="py-3 text-slate-500">
                      {(s.nextBillingDate || s.endDate) ? dayjs(s.nextBillingDate || s.endDate).format('MMM D, YYYY') : '—'}
                    </td>
                    <td className="py-3 text-slate-600">
                      {(s.paymentHistory || []).map((payment) => (
                        <div key={payment._id}>{payment.status} · {dayjs(payment.paymentDate || payment.createdAt).format('MMM D')}</div>
                      ))}
                      {!s.paymentHistory?.length && (s.razorpayPaymentId || '—')}
                    </td>
                    <td className="py-3">
                      <Badge variant={(s.status === 'active' || s.status === 'canceled')
                        && s.endDate && dayjs(s.endDate).isBefore(dayjs()) ? 'expired' : s.status}>
                        {(s.status === 'active' || s.status === 'canceled')
                        && s.endDate && dayjs(s.endDate).isBefore(dayjs()) ? 'expired' : s.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {s.status === 'suspended' || s.status === 'pending' || s.status === 'past_due'
                          || ((s.status === 'active' || s.status === 'canceled') && s.endDate && dayjs(s.endDate).isBefore(dayjs())) ? (
                          <Button size="sm" variant="success" onClick={() => manageSubscription(s, 'activate')}>Activate</Button>
                        ) : s.status === 'active' ? (
                          <Button size="sm" variant="danger" onClick={() => manageSubscription(s, 'suspend')}>Suspend</Button>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={() => manageSubscription(s, 'extend')}>Extend</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── AUDIT TRAIL TAB ── */}
      {activeTab === 'audit' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Entity</th>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Hotel</th>
                  <th className="pb-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50">
                    <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                      {dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    </td>
                    <td className="py-2.5 font-bold text-slate-900 font-mono text-[11px]">{log.action}</td>
                    <td className="py-2.5 text-slate-600">{log.entity}</td>
                    <td className="py-2.5 text-slate-700">{log.userEmail || 'System'}</td>
                    <td className="py-2.5 text-slate-500">{log.hotelId?.name || '—'}</td>
                    <td className="py-2.5 font-mono text-slate-400 text-[11px]">{log.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Plan Assignment Modal ── */}
      <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)}
        title={`Assign Plan: ${selectedHotel?.name}`}
        subtitle="Change the subscription plan for this hotel">
        <form onSubmit={handleAssignPlan} className="space-y-4">
          <Select label="Subscription Plan" required
            value={planAssignForm.planId}
            onChange={(e) => setPlanAssignForm({ ...planAssignForm, planId: e.target.value })}>
            <option value="">-- Select Plan --</option>
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} — ${p.monthlyPrice}/mo · ${p.annualPrice}/yr
              </option>
            ))}
          </Select>
          <Select label="Billing Cycle"
            value={planAssignForm.billingCycle}
            onChange={(e) => setPlanAssignForm({ ...planAssignForm, billingCycle: e.target.value })}
            options={[
              { label: 'Monthly', value: 'monthly' },
              { label: 'Annual (Save ~17%)', value: 'annual' }
            ]} />
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsPlanModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={!planAssignForm.planId}>Assign Plan</Button>
          </div>
        </form>
      </Modal>

      {/* ── Create Plan Modal ── */}
      <Modal isOpen={isNewPlanOpen} onClose={() => setIsNewPlanOpen(false)}
        title="Create Subscription Plan">
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Plan Name" required value={newPlanForm.name}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, name: e.target.value })}
              placeholder="Growth Plan" />
            <Input label="Code (unique)" required value={newPlanForm.code}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, code: e.target.value })}
              placeholder="growth" />
          </div>
          <Input label="Description" value={newPlanForm.description}
            onChange={(e) => setNewPlanForm({ ...newPlanForm, description: e.target.value })}
            placeholder="Ideal for growing boutique hotels" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Monthly Price ($)" type="number" required value={newPlanForm.monthlyPrice}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, monthlyPrice: e.target.value })} />
            <Input label="Annual Price ($)" type="number" value={newPlanForm.annualPrice}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, annualPrice: e.target.value })}
              placeholder="10× monthly" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="Max Rooms" type="number" value={newPlanForm.maxRooms}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, maxRooms: e.target.value })} />
            <Input label="Max Users" type="number" value={newPlanForm.maxUsers}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, maxUsers: e.target.value })} />
            <Input label="Max Properties" type="number" value={newPlanForm.maxProperties}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, maxProperties: e.target.value })} />
          </div>
          <Input label="Enabled Modules (comma-separated)" value={newPlanForm.enabledModules}
            onChange={(e) => setNewPlanForm({ ...newPlanForm, enabledModules: e.target.value })} />
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsNewPlanOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Plan</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(detailsHotel)} onClose={() => setDetailsHotel(null)}
        title={detailsHotel?.name || 'Hotel registration details'}
        subtitle="Hotel application and administrator information">
        {detailsHotel && (
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div><p className="text-xs text-slate-500">Hotel email</p><p className="font-semibold">{detailsHotel.email}</p></div>
            <div><p className="text-xs text-slate-500">Hotel phone</p><p className="font-semibold">{detailsHotel.phone}</p></div>
            <div><p className="text-xs text-slate-500">Hotel administrator</p><p className="font-semibold">{detailsHotel.ownerId?.name || '—'}</p></div>
            <div><p className="text-xs text-slate-500">Administrator email</p><p className="font-semibold">{detailsHotel.ownerId?.email || detailsHotel.email}</p></div>
            <div><p className="text-xs text-slate-500">Address</p><p className="font-semibold">{detailsHotel.address}, {detailsHotel.city}, {detailsHotel.state} {detailsHotel.postalCode}, {detailsHotel.country}</p></div>
            <div><p className="text-xs text-slate-500">Registration date / status</p><p className="font-semibold">{dayjs(detailsHotel.createdAt).format('MMM D, YYYY')} · {detailsHotel.registrationStatus || detailsHotel.status}</p></div>
            {detailsHotel.rejectionReason && <div className="sm:col-span-2"><p className="text-xs text-slate-500">Rejection reason</p><p className="font-semibold text-rose-700">{detailsHotel.rejectionReason}</p></div>}
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(moduleSubscribers)} onClose={() => setModuleSubscribers(null)}
        title={`${moduleSubscribers?.module?.name || 'Module'} subscribers`}
        subtitle="Hotels with current access to this module">
        <div className="space-y-3">
          {!moduleSubscribers?.subscriptions?.length && <p className="text-sm text-slate-500">No current subscribers.</p>}
          {moduleSubscribers?.subscriptions?.map((item) => (
            <div key={item._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">{item.hotelId?.name || 'Hotel'}</p>
                <p className="text-xs text-slate-500">{item.hotelId?.email} · {item.hotelId?.phone}</p>
              </div>
              <p className="text-xs text-slate-500">Expires {dayjs(item.endDate).format('MMM D, YYYY')}</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};
