import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { LogIn, LogOut, CalendarDays, CheckCircle2, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';

export const MyAttendancePage = () => {
  const [data, setData] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [leaveForm, setLeaveForm] = useState({
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    leaveType: 'casual',
    reason: ''
  });

  const load = async () => {
    try {
      setLoading(true);
      const [attRes, leaveRes] = await Promise.all([
        api.get('/staff/attendance/me'),
        api.get('/staff/leave')
      ]);
      if (attRes.data.success) setData(attRes.data.data);
      if (leaveRes.data.success) setLeaves(leaveRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const flash = (ok, msg) => {
    if (ok) { setMessage(msg); setTimeout(() => setMessage(''), 3000); }
    else { setError(msg); setTimeout(() => setError(''), 3000); }
  };

  const handleCheck = async (type) => {
    try {
      const res = await api.post(`/staff/attendance/${type}`);
      flash(true, res.data.message);
      load();
    } catch (err) {
      flash(false, err.response?.data?.message || 'Action failed.');
    }
  };

  const handleLeave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/staff/leave', leaveForm);
      flash(true, 'Leave request submitted.');
      load();
    } catch (err) {
      flash(false, err.response?.data?.message || 'Leave request failed.');
    }
  };

  if (loading && !data) return <LoadingSpinner text="Loading your attendance..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Attendance</h1>
        <p className="text-xs text-slate-500 mt-1">Daily check-in/out, working hours, and leave requests</p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex gap-2 items-center">
          <CheckCircle2 className="w-4 h-4" />{message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex gap-2 items-center">
          <AlertTriangle className="w-4 h-4" />{error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-[10px] uppercase font-bold text-slate-400">Today</p>
          <p className="text-lg font-black mt-1 capitalize">{data?.today?.status || 'Not marked'}</p>
          <p className="text-xs text-slate-500">{data?.today?.checkInTime || '—'} → {data?.today?.checkOutTime || '—'}</p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase font-bold text-slate-400">Present days</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{data?.totals?.present || 0}</p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase font-bold text-slate-400">Hours this month</p>
          <p className="text-2xl font-black text-brand-700 mt-1">{Math.round(data?.totals?.hours || 0)}</p>
        </Card>
        <Card>
          <p className="text-[10px] uppercase font-bold text-slate-400">Leave days</p>
          <p className="text-2xl font-black text-purple-700 mt-1">{data?.totals?.leave || 0}</p>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button icon={LogIn} onClick={() => handleCheck('check-in')} disabled={Boolean(data?.today?.checkInTime)}>
          Check In
        </Button>
        <Button variant="outline" icon={LogOut} onClick={() => handleCheck('check-out')} disabled={!data?.today?.checkInTime || Boolean(data?.today?.checkOutTime)}>
          Check Out
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="This month" subtitle="Clock records">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 uppercase border-b border-slate-100">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">In</th>
                  <th className="pb-2">Out</th>
                  <th className="pb-2">Hours</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.records || []).map((r) => (
                  <tr key={r._id}>
                    <td className="py-2">{dayjs(r.date).format('MMM D')}</td>
                    <td className="py-2 font-mono">{r.checkInTime || '—'}</td>
                    <td className="py-2 font-mono">{r.checkOutTime || '—'}</td>
                    <td className="py-2">{r.workingHours || 0}</td>
                    <td className="py-2 capitalize"><Badge variant={r.status}>{r.status?.replace(/_/g, ' ')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Request leave" subtitle="Pending manager approval">
          <form onSubmit={handleLeave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="From" type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} />
              <Input label="To" type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} />
            </div>
            <Select
              label="Leave type"
              value={leaveForm.leaveType}
              onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
              options={[
                { value: 'casual', label: 'Casual' },
                { value: 'sick', label: 'Sick' },
                { value: 'earned', label: 'Earned' },
                { value: 'unpaid', label: 'Unpaid' }
              ]}
            />
            <Input label="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
            <Button type="submit" icon={CalendarDays}>Submit leave</Button>
          </form>
          <div className="mt-4 space-y-2">
            {leaves.map((l) => (
              <div key={l._id} className="flex items-center justify-between text-xs border border-slate-100 rounded-lg p-2">
                <span>{dayjs(l.startDate).format('MMM D')} – {dayjs(l.endDate).format('MMM D')} · {l.leaveType}</span>
                <Badge variant={l.status}>{l.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
