import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { AlertTriangle, CheckCircle2, Plus, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';

const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];
const EMPTY_FORM = {
  leaveType: '',
  startDate: dayjs().format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
  reason: '',
  supportingDocuments: ''
};

const LeaveRequestsPage = ({ management = false }) => {
  const { user } = useAuth();
  const isAdmin = management && ['hotel_admin', 'super_admin'].includes(user?.role);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [form, setForm] = useState(EMPTY_FORM);
  const [typeDraft, setTypeDraft] = useState([]);
  const [newType, setNewType] = useState({ key: '', label: '' });
  const [dialog, setDialog] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const totalDays = useMemo(() => {
    if (!form.startDate || !form.endDate || dayjs(form.endDate).isBefore(dayjs(form.startDate), 'day')) return 0;
    return dayjs(form.endDate).startOf('day').diff(dayjs(form.startDate).startOf('day'), 'day') + 1;
  }, [form.startDate, form.endDate]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const status = isAdmin ? filter : 'all';
      const [requestsResponse, typesResponse] = await Promise.all([
        api.get(`/leave/requests?status=${status}${isAdmin ? '' : '&mine=true'}`),
        api.get('/leave/types')
      ]);
      if (requestsResponse.data.success) setRequests(requestsResponse.data.data);
      if (typesResponse.data.success) {
        setLeaveTypes(typesResponse.data.data);
        setTypeDraft(typesResponse.data.data.map((item) => ({ ...item })));
        setForm((current) => ({
          ...current,
          leaveType: current.leaveType || typesResponse.data.data.find((item) => item.active)?.key || ''
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  }, [filter, isAdmin]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const notifySuccess = (text) => {
    setMessage(text);
    setError('');
    window.setTimeout(() => setMessage(''), 4000);
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!form.reason.trim()) {
      setError('Please enter a reason for your leave request.');
      return;
    }
    if (dayjs(form.endDate).isBefore(dayjs(form.startDate), 'day')) {
      setError('End date must be the same as or later than the start date.');
      return;
    }
    try {
      setSaving(true);
      const supportingDocuments = form.supportingDocuments
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      await api.post('/leave/requests', {
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
        supportingDocuments
      });
      setForm({ ...EMPTY_FORM, leaveType: form.leaveType });
      notifySuccess('Leave request submitted for approval.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit the leave request.');
    } finally {
      setSaving(false);
    }
  };

  const saveTypes = async () => {
    try {
      setSaving(true);
      const response = await api.put('/leave/types', { leaveTypes: typeDraft });
      setLeaveTypes(response.data.data);
      setTypeDraft(response.data.data.map((item) => ({ ...item })));
      notifySuccess('Leave types saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save leave types.');
    } finally {
      setSaving(false);
    }
  };

  const addType = () => {
    const key = newType.key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const label = newType.label.trim();
    if (!key || !label || typeDraft.some((item) => item.key === key)) {
      setError('Enter a unique leave type key and a display name.');
      return;
    }
    setTypeDraft((current) => [...current, { key, label, active: true }]);
    setNewType({ key: '', label: '' });
    setError('');
  };

  const decide = async (request, status, reason = '') => {
    try {
      setSaving(true);
      await api.patch(`/leave/requests/${request._id}/review`, {
        status,
        rejectionReason: reason
      });
      setDialog(null);
      setRejectionReason('');
      notifySuccess(`Leave request ${status}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || `Could not ${status} this request.`);
    } finally {
      setSaving(false);
    }
  };

  const cancelRequest = async (request, reason = '') => {
    try {
      setSaving(true);
      await api.post(`/leave/requests/${request._id}/cancel`, {
        ...(isAdmin ? { status: 'cancelled', reason } : {})
      });
      setDialog(null);
      setRejectionReason('');
      notifySuccess('Leave request cancelled.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel this request.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && requests.length === 0 && leaveTypes.length === 0) {
    return <LoadingSpinner text="Loading leave requests..." />;
  }

  const decisionDialog = ['reject', 'cancel-approved', 'cancel-pending'].includes(dialog?.action);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isAdmin ? 'Leave Management' : 'My Leave Requests'}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {isAdmin ? 'Review and manage leave requests for your hotel.' : 'Apply for leave and track your request status.'}
          </p>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={load} loading={loading}>Refresh</Button>
      </header>

      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />{message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <AlertTriangle className="h-4 w-4" />{error}
        </div>
      )}

      {!isAdmin && (
        <Card title="Apply for leave" subtitle={`Requested duration: ${totalDays} day${totalDays === 1 ? '' : 's'}`}>
          <form onSubmit={submitRequest} className="grid gap-4 md:grid-cols-2">
            <Select
              label="Leave type"
              required
              value={form.leaveType}
              onChange={(event) => setForm((current) => ({ ...current, leaveType: event.target.value }))}
              options={leaveTypes.filter((item) => item.active).map((item) => ({ value: item.key, label: item.label }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start date" type="date" required value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
              <Input label="End date" type="date" required value={form.endDate}
                onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
            </div>
            <label className="text-xs font-semibold text-orvelle-primary">
              Application reason <span className="text-orvelle-error">*</span>
              <textarea required rows={3} value={form.reason}
                onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-orvelle-champagne focus:outline-none focus:ring-2 focus:ring-orvelle-champagne/30" />
            </label>
            <Input label="Supporting document references (optional)" value={form.supportingDocuments}
              helperText="Enter document URLs or references separated by commas."
              onChange={(event) => setForm((current) => ({ ...current, supportingDocuments: event.target.value }))} />
            <div className="md:col-span-2">
              <Button type="submit" icon={Plus} loading={saving}>Submit request</Button>
            </div>
          </form>
        </Card>
      )}

      {isAdmin && (
        <Card title="Leave types" subtitle="Hotel-specific leave type options; entitlements are not assumed.">
          <div className="space-y-3">
            {typeDraft.map((item, index) => (
              <div key={item.key} className="grid items-center gap-3 sm:grid-cols-[1fr_2fr_auto]">
                <Input label={index === 0 ? 'Type key' : undefined} value={item.key} disabled />
                <Input label={index === 0 ? 'Display name' : undefined} value={item.label}
                  onChange={(event) => setTypeDraft((current) => current.map((type, i) => i === index ? { ...type, label: event.target.value } : type))} />
                <label className="flex items-center gap-2 pt-2 text-xs font-medium text-slate-600">
                  <input type="checkbox" checked={item.active}
                    onChange={(event) => setTypeDraft((current) => current.map((type, i) => i === index ? { ...type, active: event.target.checked } : type))} />
                  Active
                </label>
              </div>
            ))}
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <Input label="New type key" value={newType.key} placeholder="bereavement"
                onChange={(event) => setNewType((current) => ({ ...current, key: event.target.value }))} />
              <Input label="New display name" value={newType.label} placeholder="Bereavement Leave"
                onChange={(event) => setNewType((current) => ({ ...current, label: event.target.value }))} />
              <Button className="self-end" variant="outline" icon={Plus} onClick={addType}>Add type</Button>
            </div>
            <Button onClick={saveTypes} loading={saving}>Save leave types</Button>
          </div>
        </Card>
      )}

      <Card title={isAdmin ? 'Leave requests' : 'Request history'} subtitle={isAdmin ? 'Employee applications and decisions' : 'Your applications and decision history'}>
        {isAdmin && (
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUSES.map((status) => (
              <Button key={status} size="sm" variant={filter === status ? 'primary' : 'outline'} onClick={() => setFilter(status)}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        )}
        {requests.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            {loading ? 'Loading requests...' : 'No leave requests to display.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase">
                  {isAdmin && <th className="pb-3">Employee / ID</th>}
                  {isAdmin && <th className="pb-3">Department</th>}
                  <th className="pb-3">Leave type</th>
                  <th className="pb-3">Requested dates</th>
                  <th className="pb-3">Days</th>
                  {isAdmin && <th className="pb-3">Reason</th>}
                  <th className="pb-3">Submitted</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((request) => (
                  <tr key={request._id}>
                    {isAdmin && <td className="py-3 font-semibold">{request.userId?.name || 'Employee'}<br /><span className="font-normal text-slate-400">{request.employeeId || '—'}</span></td>}
                    {isAdmin && <td className="py-3 capitalize">{request.department?.replace(/_/g, ' ') || '—'}</td>}
                    <td className="py-3 capitalize">{leaveTypes.find((item) => item.key === request.leaveType)?.label || request.leaveType}</td>
                    <td className="py-3">{dayjs(request.startDate).format('MMM D, YYYY')} – {dayjs(request.endDate).format('MMM D, YYYY')}</td>
                    <td className="py-3">{request.totalDays || request.days}</td>
                    {isAdmin && <td className="max-w-[200px] truncate py-3" title={request.reason}>{request.reason}</td>}
                    <td className="py-3">{dayjs(request.createdAt).format('MMM D, YYYY')}</td>
                    <td className="py-3"><Badge variant={request.status}>{request.status}</Badge></td>
                    <td className="space-x-1 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setDialog({ action: 'details', request })}>Details</Button>
                      {isAdmin && request.status === 'pending' && <>
                        <Button size="sm" variant="success" onClick={() => decide(request, 'approved')}>Approve</Button>
                        <Button size="sm" variant="danger" onClick={() => { setRejectionReason(''); setDialog({ action: 'reject', request }); }}>Reject</Button>
                      </>}
                      {!isAdmin && request.status === 'pending' && (
                        <Button size="sm" variant="danger" onClick={() => setDialog({ action: 'cancel-pending', request })}>Cancel</Button>
                      )}
                      {isAdmin && request.status === 'approved' && (
                        <Button size="sm" variant="danger" onClick={() => { setRejectionReason(''); setDialog({ action: 'cancel-approved', request }); }}>Cancel leave</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={Boolean(dialog)} onClose={() => setDialog(null)}
        title={decisionDialog
          ? dialog?.action === 'reject'
            ? 'Reject leave request'
            : dialog?.action === 'cancel-pending'
              ? 'Cancel leave request'
              : 'Cancel approved leave'
          : 'Leave request details'}>
        {decisionDialog && dialog.action === 'cancel-pending' ? (
          <p className="text-sm text-slate-600">Cancel this pending leave request?</p>
        ) : decisionDialog ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {dialog.action === 'reject'
                ? `A rejection reason is required for ${dialog.request.userId?.name || 'this employee'}.`
                : `Provide a reason for cancelling ${dialog.request.userId?.name || 'this employee'}'s approved leave.`}
            </p>
            <label className="block text-xs font-semibold text-slate-700">
              {dialog.action === 'reject' ? 'Rejection reason' : 'Cancellation reason'} <span className="text-rose-600">*</span>
              <textarea required rows={4} value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </label>
          </div>
        ) : dialog && (
          <div className="space-y-3 text-sm text-slate-700">
            <p><strong>Employee:</strong> {dialog.request.userId?.name || 'Employee'} ({dialog.request.employeeId || '—'})</p>
            <p><strong>Department:</strong> {dialog.request.department?.replace(/_/g, ' ') || '—'}</p>
            <p><strong>Type:</strong> {leaveTypes.find((item) => item.key === dialog.request.leaveType)?.label || dialog.request.leaveType}</p>
            <p><strong>Dates:</strong> {dayjs(dialog.request.startDate).format('MMM D, YYYY')} – {dayjs(dialog.request.endDate).format('MMM D, YYYY')} ({dialog.request.totalDays || dialog.request.days} days)</p>
            <p><strong>Reason:</strong> {dialog.request.reason || '—'}</p>
            <p><strong>Submitted:</strong> {dayjs(dialog.request.createdAt).format('MMM D, YYYY h:mm A')}</p>
            {dialog.request.approvedAt && <p><strong>Approved:</strong> {dialog.request.approvedBy?.name || 'Approver'} · {dayjs(dialog.request.approvedAt).format('MMM D, YYYY h:mm A')}</p>}
            {dialog.request.rejectedAt && <p><strong>Rejected:</strong> {dialog.request.rejectedBy?.name || 'Approver'} · {dayjs(dialog.request.rejectedAt).format('MMM D, YYYY h:mm A')}</p>}
            {dialog.request.rejectionReason && <p><strong>Rejection reason:</strong> {dialog.request.rejectionReason}</p>}
            {dialog.request.supportingDocuments?.length > 0 && <p><strong>Supporting documents:</strong> {dialog.request.supportingDocuments.join(', ')}</p>}
            {dialog.request.decisionHistory?.length > 0 && (
              <div><strong>Status history</strong>
                <ul className="mt-1 space-y-1">
                  {dialog.request.decisionHistory.map((entry, index) => (
                    <li key={`${entry.status}-${entry.timestamp}-${index}`} className="text-xs text-slate-500">
                      {entry.status} · {dayjs(entry.timestamp).format('MMM D, YYYY h:mm A')} · {entry.actorRole}
                      {entry.reason ? ` · ${entry.reason}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {decisionDialog && (
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialog(null)}>Keep request</Button>
            <Button variant="danger" loading={saving}
              disabled={dialog.action !== 'cancel-pending' && !rejectionReason.trim()}
              onClick={() => dialog.action === 'cancel-pending'
                ? cancelRequest(dialog.request)
                : dialog.action === 'reject'
                  ? decide(dialog.request, 'rejected', rejectionReason)
                  : cancelRequest(dialog.request, rejectionReason)}>
              {dialog.action === 'reject' ? 'Reject request' : dialog.action === 'cancel-pending' ? 'Cancel request' : 'Cancel approved leave'}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LeaveRequestsPage;
