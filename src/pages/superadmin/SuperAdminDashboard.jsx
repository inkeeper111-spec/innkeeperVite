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
      const [statsRes, hotelsRes, plansRes, subsRes, logsRes] = await Promise.all([
        api.get('/superadmin/stats'),
        api.get('/superadmin/hotels?limit=50'),
        api.get('/superadmin/plans'),
        api.get('/superadmin/subscriptions?limit=20'),
        api.get('/superadmin/audit-logs?limit=30')
      ]);
      if (statsRes.data.success)        setStats(statsRes.data.data);
      if (hotelsRes.data.success)       setHotels(hotelsRes.data.data.hotels);
      if (plansRes.data.success)        setPlans(plansRes.data.data);
      if (subsRes.data.success)         setSubscriptions(subsRes.data.data.subscriptions);
      if (logsRes.data.success)         setAuditLogs(logsRes.data.data.logs);
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

  const filteredHotels = hotels.filter((h) => {
    const matchSearch = h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.email.toLowerCase().includes(search.toLowerCase()) ||
      (h.city || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || h.status === statusFilter;
    return matchSearch && matchStatus;
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Status</th>
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
                      <button onClick={() => handleOpenPlanAssign(h)}
                        className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 hover:bg-brand-100 transition-colors flex items-center gap-1">
                        {h.currentPlanId?.name || 'No Plan'}
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                    </td>
                    <td className="py-3.5"><Badge variant={h.status}>{h.status}</Badge></td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {h.status !== 'active' && (
                          <Button size="sm" variant="success" icon={CheckCircle}
                            onClick={() => handleUpdateStatus(h._id, 'active')}>
                            Approve
                          </Button>
                        )}
                        {h.status === 'active' && (
                          <Button size="sm" variant="danger" icon={XCircle}
                            onClick={() => handleUpdateStatus(h._id, 'suspended')}>
                            Suspend
                          </Button>
                        )}
                        {h.status !== 'rejected' && h.status !== 'active' && (
                          <Button size="sm" variant="outline"
                            onClick={() => handleReject(h)}>
                            Reject
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Hotel</th>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Cycle</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Expires</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-slate-900">{s.hotelId?.name || '—'}</td>
                    <td className="py-3 font-semibold text-brand-700">{s.planId?.name || '—'}</td>
                    <td className="py-3 capitalize text-slate-600">{s.billingCycle}</td>
                    <td className="py-3 font-black text-slate-900">${s.amount}</td>
                    <td className="py-3 text-slate-500">
                      {s.endDate ? dayjs(s.endDate).format('MMM D, YYYY') : '—'}
                    </td>
                    <td className="py-3 text-right"><Badge variant={s.status}>{s.status}</Badge></td>
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monthly Price ($)" type="number" required value={newPlanForm.monthlyPrice}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, monthlyPrice: e.target.value })} />
            <Input label="Annual Price ($)" type="number" value={newPlanForm.annualPrice}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, annualPrice: e.target.value })}
              placeholder="10× monthly" />
          </div>
          <div className="grid grid-cols-3 gap-3">
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
    </div>
  );
};
