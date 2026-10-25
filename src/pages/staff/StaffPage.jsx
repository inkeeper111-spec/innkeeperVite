import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  UserCheck, PlusCircle, Calendar, Clock, CheckCircle2,
  DollarSign, Pencil, ClipboardList, BarChart3,
  TrendingDown, AlertTriangle, CreditCard, Layers
} from 'lucide-react';
import dayjs from 'dayjs';

const TABS = [
  { key: 'directory',  label: 'Employee Directory', icon: UserCheck },
  { key: 'attendance', label: 'Attendance',          icon: ClipboardList },
  { key: 'summary',    label: 'Monthly Summary',     icon: BarChart3 },
  { key: 'salary',     label: 'Salary & Payroll',    icon: DollarSign },
  { key: 'leave',      label: 'Leave',               icon: Calendar },
  { key: 'advances',   label: 'Advances',            icon: CreditCard },
  { key: 'shifts',     label: 'Shift Rosters',       icon: Calendar }
];

const STATUS_COLORS = {
  present:  'text-emerald-700 bg-emerald-50 border-emerald-200',
  absent:   'text-rose-700 bg-rose-50 border-rose-200',
  late:     'text-amber-700 bg-amber-50 border-amber-200',
  half_day: 'text-blue-700 bg-blue-50 border-blue-200',
  on_leave: 'text-purple-700 bg-purple-50 border-purple-200'
};

export const StaffPage = () => {
  const [activeTab,   setActiveTab]   = useState('directory');
  const [staff,       setStaff]       = useState([]);
  const [shifts,      setShifts]      = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [message,     setMessage]     = useState('');
  const [error,       setError]       = useState('');

  // Date filters
  const [attendanceDate, setAttendanceDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [summaryMonth,   setSummaryMonth]   = useState(dayjs().format('YYYY-MM'));

  // Modals
  const [isAddStaffOpen,    setIsAddStaffOpen]    = useState(false);
  const [isEditStaffOpen,   setIsEditStaffOpen]   = useState(false);
  const [isAddShiftOpen,    setIsAddShiftOpen]    = useState(false);
  const [isAttMarkOpen,     setIsAttMarkOpen]     = useState(false);
  const [isBulkOpen,        setIsBulkOpen]        = useState(false);
  const [isSalaryOpen,      setIsSalaryOpen]      = useState(false);
  const [editingStaff,      setEditingStaff]      = useState(null);

  // Forms
  const [staffForm, setStaffForm] = useState({
    name: '', email: '', password: '', role: 'receptionist',
    department: 'front_desk', designation: 'Front Desk Agent', phone: '', salary: 3500,
    allowances: 0, fixedDeductions: 0
  });
  const [editForm,  setEditForm]  = useState({});
  const [shiftForm, setShiftForm] = useState({
    userId: '', shiftDate: dayjs().format('YYYY-MM-DD'),
    shiftType: 'morning', startTime: '07:00', endTime: '15:30', notes: ''
  });
  const [attForm, setAttForm] = useState({
    userId: '', date: dayjs().format('YYYY-MM-DD'),
    checkInTime: '09:00', checkOutTime: '18:00', status: 'present', notes: ''
  });
  const [bulkDate,        setBulkDate]        = useState(dayjs().format('YYYY-MM-DD'));
  const [bulkStatus,      setBulkStatus]      = useState('present');
  const [salaryMonth,     setSalaryMonth]     = useState(dayjs().format('YYYY-MM'));
  const [salaryMethod,    setSalaryMethod]    = useState('bank_transfer');
  const [selectedForPay,  setSelectedForPay]  = useState([]); // staffProfileIds
  const [advanceForm, setAdvanceForm] = useState({
    staffProfileId: '',
    amount: '',
    month: dayjs().format('YYYY-MM'),
    notes: ''
  });

  const showMsg = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };
  const showErr = (msg) => { setError(msg);   setTimeout(() => setError(''),   4000); };

  const fetchStaff = useCallback(async () => {
    const res = await api.get('/staff');
    if (res.data.success) setStaff(res.data.data);
  }, []);

  const fetchShifts = useCallback(async () => {
    const res = await api.get('/staff/shifts');
    if (res.data.success) setShifts(res.data.data);
  }, []);

  const fetchAttendance = useCallback(async (date) => {
    const d = date || attendanceDate;
    const res = await api.get(`/staff/attendance?startDate=${d}&endDate=${d}&limit=100`);
    if (res.data.success) setAttendance(res.data.data.attendance);
  }, [attendanceDate]);

  const fetchSummary = useCallback(async (month) => {
    const m = month || summaryMonth;
    const res = await api.get(`/staff/attendance/summary?month=${m}`);
    if (res.data.success) setSummary(res.data.data);
  }, [summaryMonth]);

  const fetchSalaryHistory = useCallback(async () => {
    const res = await api.get('/staff/salary?limit=50');
    if (res.data.success) setSalaryHistory(res.data.data.records);
  }, []);

  const fetchLeaves = useCallback(async () => {
    const res = await api.get('/staff/leave');
    if (res.data.success) setLeaves(res.data.data);
  }, []);

  const fetchAdvances = useCallback(async () => {
    const res = await api.get('/staff/advances');
    if (res.data.success) setAdvances(res.data.data);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchStaff(), fetchShifts(), fetchAttendance(), fetchSummary(), fetchSalaryHistory(), fetchLeaves(), fetchAdvances()]);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  // ── Tab change side-effects ──
  useEffect(() => {
    if (activeTab === 'attendance') fetchAttendance(attendanceDate);
    if (activeTab === 'summary')   fetchSummary(summaryMonth);
    if (activeTab === 'salary')    fetchSalaryHistory();
    if (activeTab === 'leave')     fetchLeaves();
    if (activeTab === 'advances')  fetchAdvances();
  }, [activeTab]);

  // ── Staff CRUD ──────────────────────────────────────────────────────────────
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/staff', staffForm);
      if (res.data.success) {
        setIsAddStaffOpen(false);
        showMsg(`${staffForm.name} onboarded successfully.`);
        fetchStaff();
      }
    } catch (err) { showErr(err.response?.data?.message || 'Failed to add staff.'); }
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/staff/${editingStaff._id}`, editForm);
      setIsEditStaffOpen(false);
      showMsg('Staff profile updated.');
      fetchStaff();
    } catch (err) { showErr('Failed to update staff.'); }
  };

  const openEdit = (s) => {
    setEditingStaff(s);
    setEditForm({
      name:        s.userId?.name || '',
      phone:       s.userId?.phone || '',
      designation: s.designation,
      department:  s.department,
      salary:      s.salary,
      allowances:  s.allowances || 0,
      fixedDeductions: s.fixedDeductions || 0,
      status:      s.status
    });
    setIsEditStaffOpen(true);
  };

  // ── Attendance ──────────────────────────────────────────────────────────────
  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    try {
      await api.post('/staff/attendance', attForm);
      setIsAttMarkOpen(false);
      showMsg('Attendance recorded.');
      fetchAttendance(attForm.date);
    } catch (err) { showErr(err.response?.data?.message || 'Failed to record attendance.'); }
  };

  const handleBulkMark = async (e) => {
    e.preventDefault();
    try {
      await api.post('/staff/attendance/bulk', { date: bulkDate, defaultStatus: bulkStatus });
      setIsBulkOpen(false);
      showMsg(`All staff marked as "${bulkStatus}" for ${dayjs(bulkDate).format('MMM D, YYYY')}.`);
      fetchAttendance(bulkDate);
      setAttendanceDate(bulkDate);
    } catch (err) { showErr('Bulk mark failed.'); }
  };

  const handleQuickStatusChange = async (record, newStatus) => {
    try {
      if (record._id) {
        await api.patch(`/staff/attendance/${record._id}`, { status: newStatus });
      } else {
        await api.post('/staff/attendance', { ...record, status: newStatus });
      }
      fetchAttendance(attendanceDate);
    } catch (err) { showErr('Status update failed.'); }
  };

  // ── Salary ──────────────────────────────────────────────────────────────────
  const handleProcessSalary = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/staff/salary/process', {
        month:           salaryMonth,
        staffProfileIds: selectedForPay,
        paymentMethod:   salaryMethod
      });
      if (res.data.success) {
        setIsSalaryOpen(false);
        setSelectedForPay([]);
        showMsg(res.data.message);
        fetchSalaryHistory();
        fetchSummary(salaryMonth);
      }
    } catch (err) { showErr(err.response?.data?.message || 'Salary processing failed.'); }
  };

  const toggleSelectPay = (id) => {
    setSelectedForPay((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Attendance for date table (merge staff list with existing records) ──────
  const attendanceMap = attendance.reduce((acc, r) => {
    acc[r.userId?._id || r.userId] = r;
    return acc;
  }, {});

  const staffWithAttendance = staff.map((s) => ({
    ...s,
    attendanceRecord: attendanceMap[s.userId?._id] || null
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff, Attendance & Payroll</h1>
          <p className="text-xs text-slate-500 mt-1">
            Employee directory, daily attendance tracking, monthly payroll processing, and salary expense integration
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'attendance' && (
            <>
              <Button variant="outline" size="sm" icon={Layers} onClick={() => setIsBulkOpen(true)}>
                Bulk Mark
              </Button>
              <Button variant="primary" size="sm" icon={ClipboardList} onClick={() => setIsAttMarkOpen(true)}>
                Mark Attendance
              </Button>
            </>
          )}
          {activeTab === 'salary' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const res = await api.get(`/staff/salary/export?month=${salaryMonth}`, { responseType: 'blob' });
                  const url = window.URL.createObjectURL(res.data);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `payroll-${salaryMonth}.csv`;
                  link.click();
                  window.URL.revokeObjectURL(url);
                }}
              >
                Download Payroll CSV
              </Button>
              <Button variant="primary" size="sm" icon={DollarSign} onClick={() => setIsSalaryOpen(true)}>
                Process Salary
              </Button>
            </>
          )}
          {activeTab === 'shifts' && (
            <Button variant="outline" size="sm" icon={Calendar} onClick={() => setIsAddShiftOpen(true)}>
              Schedule Shift
            </Button>
          )}
          {activeTab === 'directory' && (
            <Button variant="primary" size="sm" icon={PlusCircle} onClick={() => setIsAddStaffOpen(true)}>
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Banners */}
      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />{message}
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />{error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`py-3 px-5 font-semibold text-sm border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── DIRECTORY TAB ── */}
      {activeTab === 'directory' && (
        <Card>
          {loading ? <LoadingSpinner text="Loading staff records..." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="pb-3">Employee</th>
                    <th className="pb-3">ID</th>
                    <th className="pb-3">Department</th>
                    <th className="pb-3">Designation</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Monthly Salary</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5">
                        <p className="font-bold text-slate-900">{s.userId?.name}</p>
                        <p className="text-[11px] text-slate-400">{s.userId?.email}</p>
                      </td>
                      <td className="py-3.5 font-mono text-slate-500">{s.employeeId}</td>
                      <td className="py-3.5 capitalize font-semibold text-slate-700">
                        {s.department?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 text-slate-600">{s.designation}</td>
                      <td className="py-3.5 capitalize text-brand-600 font-medium">
                        {s.userId?.role?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 font-black text-slate-900">
                        ${Number(s.salary).toLocaleString()}
                      </td>
                      <td className="py-3.5"><Badge variant={s.status}>{s.status}</Badge></td>
                      <td className="py-3.5 text-right">
                        <Button size="sm" variant="secondary" icon={Pencil} onClick={() => openEdit(s)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === 'attendance' && (
        <>
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Select Date</label>
              <input type="date" value={attendanceDate}
                onChange={(e) => { setAttendanceDate(e.target.value); fetchAttendance(e.target.value); }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>
            <div className="ml-auto text-xs text-slate-500 font-medium">
              {dayjs(attendanceDate).format('dddd, MMMM D, YYYY')}
            </div>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="pb-3">Employee</th>
                    <th className="pb-3">Department</th>
                    <th className="pb-3">Clock In</th>
                    <th className="pb-3">Clock Out</th>
                    <th className="pb-3">Hours</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Notes</th>
                    <th className="pb-3 text-right">Quick Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffWithAttendance.map((s) => {
                    const rec = s.attendanceRecord;
                    return (
                      <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-bold text-slate-900">{s.userId?.name}</td>
                        <td className="py-3 capitalize text-slate-600 text-[11px]">
                          {s.department?.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 font-mono font-bold text-emerald-700">
                          {rec?.checkInTime || '—'}
                        </td>
                        <td className="py-3 font-mono text-slate-500">
                          {rec?.checkOutTime || '—'}
                        </td>
                        <td className="py-3 font-semibold text-slate-700">{rec?.workingHours || 0}</td>
                        <td className="py-3">
                          {rec ? (
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[rec.status] || ''}`}>
                              {rec.status.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Not marked</span>
                          )}
                        </td>
                        <td className="py-3 text-slate-400 text-[11px]">{rec?.notes || '—'}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            {['present','absent','late','half_day','on_leave'].map((st) => (
                              <button key={st}
                                onClick={() => handleQuickStatusChange(
                                  rec || { userId: s.userId?._id, date: attendanceDate },
                                  st
                                )}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors capitalize ${
                                  rec?.status === st
                                    ? STATUS_COLORS[st]
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {st.replace(/_/g, ' ')}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ── MONTHLY SUMMARY TAB ── */}
      {activeTab === 'summary' && (
        <>
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Select Month</label>
              <input type="month" value={summaryMonth}
                onChange={(e) => { setSummaryMonth(e.target.value); fetchSummary(e.target.value); }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>
            {summary && (
              <div className="ml-auto flex gap-4 text-xs">
                <div className="text-center">
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Working Days</p>
                  <p className="font-black text-slate-900 text-lg">{summary.workingDays}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 font-semibold uppercase text-[10px]">Total Payroll</p>
                  <p className="font-black text-rose-600 text-lg">${summary.totalPayroll?.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          {!summary ? (
            <LoadingSpinner text="Computing monthly summary..." />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                      <th className="pb-3">Employee</th>
                      <th className="pb-3">Dept</th>
                      <th className="pb-3 text-center">Present</th>
                      <th className="pb-3 text-center">Absent</th>
                      <th className="pb-3 text-center">Half Day</th>
                      <th className="pb-3 text-center">Leave</th>
                      <th className="pb-3 text-center">Late</th>
                      <th className="pb-3 text-right">Base Salary</th>
                      <th className="pb-3 text-right">Deduction</th>
                      <th className="pb-3 text-right">Earned Salary</th>
                      <th className="pb-3 text-right">Salary Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.summary?.map((s) => (
                      <tr key={s.userId} className={`hover:bg-slate-50 transition-colors ${s.absentDays > 3 ? 'bg-rose-50/40' : ''}`}>
                        <td className="py-3">
                          <p className="font-bold text-slate-900">{s.name}</p>
                          <p className="text-[11px] text-slate-400">{s.employeeId}</p>
                        </td>
                        <td className="py-3 capitalize text-slate-600 text-[11px]">
                          {s.department?.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 text-center font-bold text-emerald-700">{s.presentDays}</td>
                        <td className={`py-3 text-center font-bold ${s.absentDays > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {s.absentDays}
                        </td>
                        <td className="py-3 text-center text-blue-600 font-bold">{s.halfDays}</td>
                        <td className="py-3 text-center text-purple-600 font-bold">{s.leaveDays}</td>
                        <td className="py-3 text-center text-amber-600 font-bold">{s.lateDays}</td>
                        <td className="py-3 text-right font-semibold text-slate-700">
                          ${s.baseSalary.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-bold text-rose-600">
                          {s.deductionAmount > 0 ? `-$${s.deductionAmount.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 text-right font-black text-slate-900">
                          ${s.earnedSalary.toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                            s.salaryStatus === 'paid'          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            s.salaryStatus === 'processed'     ? 'bg-brand-50 text-brand-700 border-brand-200'       :
                            s.salaryStatus === 'not_processed' ? 'bg-slate-50 text-slate-500 border-slate-200'       :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {s.salaryStatus.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── SALARY TAB ── */}
      {activeTab === 'salary' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Paid This Month', value: `$${salaryHistory.filter(s => s.month === dayjs().format('YYYY-MM') && s.status === 'paid').reduce((a,b) => a + b.netSalary, 0).toLocaleString()}`, color: 'text-emerald-600' },
              { label: 'Records Total',   value: salaryHistory.length, color: 'text-slate-900' },
              { label: 'Unique Months',   value: [...new Set(salaryHistory.map(s => s.month))].length, color: 'text-brand-600' },
              { label: 'Total Bonuses',   value: `$${salaryHistory.reduce((a,b) => a + (b.bonusAmount || 0), 0).toLocaleString()}`, color: 'text-amber-600' }
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
                <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
              </Card>
            ))}
          </div>

          <Card title="Salary Disbursement History" subtitle="All processed payroll records auto-linked to expense ledger">
            {salaryHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No salary records yet. Process your first payroll run.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                      <th className="pb-3">Employee</th>
                      <th className="pb-3">Month</th>
                      <th className="pb-3 text-center">Present</th>
                      <th className="pb-3 text-right">Base Salary</th>
                      <th className="pb-3 text-right">Deduction</th>
                      <th className="pb-3 text-right">Bonus</th>
                      <th className="pb-3 text-right">Net Salary</th>
                      <th className="pb-3">Method</th>
                      <th className="pb-3">Expense Ref</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salaryHistory.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <p className="font-bold text-slate-900">{r.userId?.name}</p>
                          <p className="text-[11px] text-slate-400">{r.staffProfileId?.employeeId}</p>
                        </td>
                        <td className="py-3 font-semibold text-slate-700">
                          {dayjs(r.month).format('MMMM YYYY')}
                        </td>
                        <td className="py-3 text-center font-bold text-emerald-700">{r.presentDays}/{r.workingDays}</td>
                        <td className="py-3 text-right font-semibold text-slate-700">${r.baseSalary?.toLocaleString()}</td>
                        <td className="py-3 text-right font-bold text-rose-600">
                          {r.deductionAmount > 0 ? `-$${r.deductionAmount}` : '—'}
                        </td>
                        <td className="py-3 text-right font-bold text-amber-600">
                          {r.bonusAmount > 0 ? `+$${r.bonusAmount}` : '—'}
                        </td>
                        <td className="py-3 text-right font-black text-slate-900">${r.netSalary?.toLocaleString()}</td>
                        <td className="py-3 capitalize text-slate-600 text-[11px]">
                          {r.paymentMethod?.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 font-mono text-[11px] text-brand-600">
                          {r.expenseId ? '✓ Logged' : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <Badge variant={r.status === 'paid' ? 'active' : r.status}>{r.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === 'leave' && (
        <Card title="Leave requests" subtitle="Approve or reject staff leave">
          {leaves.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">No leave requests.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 uppercase border-b border-slate-100">
                  <th className="pb-2">Employee</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Dates</th>
                  <th className="pb-2">Days</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((l) => (
                  <tr key={l._id}>
                    <td className="py-3 font-semibold">{l.userId?.name}</td>
                    <td className="py-3 capitalize">{l.leaveType}</td>
                    <td className="py-3">{dayjs(l.startDate).format('MMM D')} – {dayjs(l.endDate).format('MMM D')}</td>
                    <td className="py-3">{l.days}</td>
                    <td className="py-3"><Badge variant={l.status}>{l.status}</Badge></td>
                    <td className="py-3 text-right space-x-1">
                      {l.status === 'pending' && (
                        <>
                          <Button size="sm" variant="success" onClick={async () => { await api.patch(`/staff/leave/${l._id}`, { status: 'approved' }); fetchLeaves(); }}>Approve</Button>
                          <Button size="sm" variant="danger" onClick={async () => { await api.patch(`/staff/leave/${l._id}`, { status: 'rejected' }); fetchLeaves(); }}>Reject</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === 'advances' && (
        <Card title="Salary advances" subtitle="Deducted automatically in payroll for the selected month">
          <form
            className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.post('/staff/advances', {
                  staffProfileId: advanceForm.staffProfileId,
                  amount: Number(advanceForm.amount),
                  month: advanceForm.month,
                  notes: advanceForm.notes
                });
                showMsg('Advance recorded.');
                setAdvanceForm({ staffProfileId: '', amount: '', month: dayjs().format('YYYY-MM'), notes: '' });
                fetchAdvances();
              } catch (err) {
                showErr(err.response?.data?.message || 'Failed to record advance.');
              }
            }}
          >
            <Select
              required
              value={advanceForm.staffProfileId}
              onChange={(e) => setAdvanceForm({ ...advanceForm, staffProfileId: e.target.value })}
              options={[{ value: '', label: 'Employee' }, ...staff.map((s) => ({ value: s._id, label: s.userId?.name || 'Staff' }))]}
            />
            <Input required type="number" placeholder="Amount" value={advanceForm.amount} onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })} />
            <Input type="month" value={advanceForm.month} onChange={(e) => setAdvanceForm({ ...advanceForm, month: e.target.value })} />
            <div className="flex gap-2">
              <Input placeholder="Notes" value={advanceForm.notes} onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })} />
              <Button type="submit" size="sm">Add</Button>
            </div>
          </form>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 uppercase border-b border-slate-100">
                <th className="pb-2">Employee</th>
                <th className="pb-2">Month</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {advances.map((a) => (
                <tr key={a._id}>
                  <td className="py-2 font-semibold">{a.userId?.name}</td>
                  <td className="py-2">{a.month}</td>
                  <td className="py-2 font-black">${a.amount}</td>
                  <td className="py-2"><Badge variant={a.status}>{a.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── SHIFTS TAB ── */}
      {activeTab === 'shifts' && (
        <Card>
          {shifts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No shifts scheduled yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="pb-3">Staff Member</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Shift Type</th>
                    <th className="pb-3">Hours</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shifts.map((sh) => (
                    <tr key={sh._id} className="hover:bg-slate-50">
                      <td className="py-3 font-semibold text-slate-800">{sh.userId?.name}</td>
                      <td className="py-3 text-slate-600">{dayjs(sh.shiftDate).format('MMM D, YYYY')}</td>
                      <td className="py-3 capitalize font-bold text-brand-700">{sh.shiftType}</td>
                      <td className="py-3 text-slate-500 font-mono">{sh.startTime} – {sh.endTime}</td>
                      <td className="py-3 text-right"><Badge variant={sh.status}>{sh.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ═══════════════════ MODALS ═══════════════════ */}

      {/* Add Staff */}
      <Modal isOpen={isAddStaffOpen} onClose={() => setIsAddStaffOpen(false)}
        title="Add Staff Member" subtitle="Provision account and department role">
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <Input label="Full Name" required value={staffForm.name}
            onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} placeholder="Jane Doe" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Work Email" type="email" required value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
            <Input label="Initial Password" type="password" required value={staffForm.password}
              onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} placeholder="••••••••" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Department" value={staffForm.department}
              onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
              options={[
                { label: 'Front Desk',   value: 'front_desk' },
                { label: 'Housekeeping', value: 'housekeeping' },
                { label: 'Restaurant',   value: 'restaurant' },
                { label: 'Maintenance',  value: 'maintenance' },
                { label: 'Management',   value: 'management' },
                { label: 'Accounts',     value: 'accounts' },
                { label: 'Security',     value: 'security' }
              ]} />
            <Select label="System Role" value={staffForm.role}
              onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
              options={[
                { label: 'Receptionist',       value: 'receptionist' },
                { label: 'Housekeeping Staff',  value: 'housekeeping_staff' },
                { label: 'Restaurant Staff',    value: 'restaurant_staff' },
                { label: 'Maintenance Staff',   value: 'maintenance_staff' },
                { label: 'Hotel Administrator', value: 'hotel_admin' }
              ]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Designation" value={staffForm.designation}
              onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })} placeholder="Shift Supervisor" />
            <Input label="Basic Salary" type="number" value={staffForm.salary}
              onChange={(e) => setStaffForm({ ...staffForm, salary: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Allowances" type="number" value={staffForm.allowances}
              onChange={(e) => setStaffForm({ ...staffForm, allowances: e.target.value })} />
            <Input label="Fixed Deductions" type="number" value={staffForm.fixedDeductions}
              onChange={(e) => setStaffForm({ ...staffForm, fixedDeductions: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsAddStaffOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Onboard Employee</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff */}
      <Modal isOpen={isEditStaffOpen} onClose={() => setIsEditStaffOpen(false)}
        title={`Edit: ${editingStaff?.userId?.name}`}>
        <form onSubmit={handleUpdateStaff} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Full Name" value={editForm.name || ''}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <Input label="Phone" value={editForm.phone || ''}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Department" value={editForm.department || 'front_desk'}
              onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
              options={[
                { label: 'Front Desk',   value: 'front_desk' },
                { label: 'Housekeeping', value: 'housekeeping' },
                { label: 'Restaurant',   value: 'restaurant' },
                { label: 'Maintenance',  value: 'maintenance' },
                { label: 'Management',   value: 'management' },
                { label: 'Accounts',     value: 'accounts' },
                { label: 'Security',     value: 'security' }
              ]} />
            <Select label="Employment Status" value={editForm.status || 'active'}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              options={[
                { label: 'Active',     value: 'active' },
                { label: 'On Leave',   value: 'on_leave' },
                { label: 'Terminated', value: 'terminated' }
              ]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Designation" value={editForm.designation || ''}
              onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} />
            <Input label="Basic Salary" type="number" value={editForm.salary || 0}
              onChange={(e) => setEditForm({ ...editForm, salary: e.target.value, basicSalary: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Allowances" type="number" value={editForm.allowances || 0}
              onChange={(e) => setEditForm({ ...editForm, allowances: e.target.value })} />
            <Input label="Fixed Deductions" type="number" value={editForm.fixedDeductions || 0}
              onChange={(e) => setEditForm({ ...editForm, fixedDeductions: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsEditStaffOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Mark Attendance (single) */}
      <Modal isOpen={isAttMarkOpen} onClose={() => setIsAttMarkOpen(false)}
        title="Record Attendance" subtitle="Mark attendance for a specific staff member">
        <form onSubmit={handleMarkAttendance} className="space-y-4">
          <Select label="Staff Member" required value={attForm.userId}
            onChange={(e) => setAttForm({ ...attForm, userId: e.target.value })}>
            <option value="">-- Select Employee --</option>
            {staff.map((s) => (
              <option key={s.userId?._id} value={s.userId?._id}>
                {s.userId?.name} — {s.department?.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={attForm.date}
              onChange={(e) => setAttForm({ ...attForm, date: e.target.value })} />
            <Select label="Status" value={attForm.status}
              onChange={(e) => setAttForm({ ...attForm, status: e.target.value })}
              options={[
                { label: 'Present',  value: 'present' },
                { label: 'Absent',   value: 'absent' },
                { label: 'Late',     value: 'late' },
                { label: 'Half Day', value: 'half_day' },
                { label: 'On Leave', value: 'on_leave' }
              ]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Clock In" type="time" value={attForm.checkInTime}
              onChange={(e) => setAttForm({ ...attForm, checkInTime: e.target.value })} />
            <Input label="Clock Out" type="time" value={attForm.checkOutTime}
              onChange={(e) => setAttForm({ ...attForm, checkOutTime: e.target.value })} />
          </div>
          <Input label="Notes" value={attForm.notes}
            onChange={(e) => setAttForm({ ...attForm, notes: e.target.value })}
            placeholder="Late due to traffic" />
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsAttMarkOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={!attForm.userId}>Record</Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Mark Attendance */}
      <Modal isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)}
        title="Bulk Mark Attendance" subtitle="Mark all active staff with one status for a date">
        <form onSubmit={handleBulkMark} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)} />
            <Select label="Default Status" value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              options={[
                { label: 'Present',  value: 'present' },
                { label: 'Absent',   value: 'absent' },
                { label: 'On Leave', value: 'on_leave' }
              ]} />
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
            This will mark all {staff.filter(s => s.status === 'active').length} active staff members as <strong>"{bulkStatus}"</strong> for {dayjs(bulkDate).format('MMM D, YYYY')}. Existing records for today will be overwritten.
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsBulkOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Apply Bulk Mark</Button>
          </div>
        </form>
      </Modal>

      {/* Process Salary */}
      <Modal isOpen={isSalaryOpen} onClose={() => setIsSalaryOpen(false)}
        title="Process Monthly Salary" subtitle="Calculate attendance-based salaries and auto-log as expenses"
        maxWidth="max-w-2xl">
        <form onSubmit={handleProcessSalary} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">Payroll Month</label>
              <input type="month" value={salaryMonth}
                onChange={(e) => { setSalaryMonth(e.target.value); fetchSummary(e.target.value); }}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <Select label="Payment Method" value={salaryMethod}
              onChange={(e) => setSalaryMethod(e.target.value)}
              options={[
                { label: 'Bank Transfer', value: 'bank_transfer' },
                { label: 'Cash',          value: 'cash' },
                { label: 'Cheque',        value: 'cheque' },
                { label: 'UPI',           value: 'upi' }
              ]} />
          </div>

          {/* Staff selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase text-slate-600">
                Select Staff to Pay (leave blank to process ALL)
              </label>
              {selectedForPay.length > 0 && (
                <button type="button" onClick={() => setSelectedForPay([])}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold">
                  Clear selection
                </button>
              )}
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100">
              {staff.filter(s => s.status === 'active').map((s) => {
                const summaryRow = summary?.summary?.find(r => r.userId === s.userId?._id);
                const alreadyPaid = summaryRow?.salaryStatus === 'paid';
                return (
                  <label key={s._id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 text-xs ${alreadyPaid ? 'opacity-50' : ''}`}>
                    <input type="checkbox" disabled={alreadyPaid}
                      checked={selectedForPay.includes(s._id)}
                      onChange={() => toggleSelectPay(s._id)}
                      className="rounded border-slate-300 text-brand-600" />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900">{s.userId?.name}</span>
                      <span className="text-slate-400 ml-2">{s.employeeId}</span>
                    </div>
                    <span className="font-bold text-slate-700">
                      ${summaryRow ? summaryRow.earnedSalary.toLocaleString() : s.salary.toLocaleString()}
                    </span>
                    {alreadyPaid && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Paid</span>}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800">
            <strong>Note:</strong> Salary calculations are based on recorded attendance. Each processed salary automatically creates an <strong>Expense record</strong> under the <strong>Salaries</strong> category, keeping your financial ledger in sync.
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsSalaryOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" icon={DollarSign}>
              Process & Log Expenses
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Shift */}
      <Modal isOpen={isAddShiftOpen} onClose={() => setIsAddShiftOpen(false)} title="Schedule Work Shift">
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.post('/staff/shifts', shiftForm);
            setIsAddShiftOpen(false);
            showMsg('Shift scheduled.');
            fetchShifts();
          } catch { showErr('Failed to schedule shift.'); }
        }} className="space-y-4">
          <Select label="Staff Member" required value={shiftForm.userId}
            onChange={(e) => setShiftForm({ ...shiftForm, userId: e.target.value })}>
            <option value="">-- Choose Employee --</option>
            {staff.map((s) => (
              <option key={s.userId?._id} value={s.userId?._id}>
                {s.userId?.name} ({s.department?.replace(/_/g, ' ')})
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Shift Date" type="date" required value={shiftForm.shiftDate}
              onChange={(e) => setShiftForm({ ...shiftForm, shiftDate: e.target.value })} />
            <Select label="Shift Type" value={shiftForm.shiftType}
              onChange={(e) => setShiftForm({ ...shiftForm, shiftType: e.target.value })}
              options={[
                { label: 'Morning (07:00–15:30)',  value: 'morning' },
                { label: 'Evening (15:00–23:30)',  value: 'evening' },
                { label: 'Night (23:00–07:30)',    value: 'night' },
                { label: 'General (09:00–18:00)',  value: 'general' }
              ]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" value={shiftForm.startTime}
              onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} />
            <Input label="End Time" type="time" value={shiftForm.endTime}
              onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsAddShiftOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={!shiftForm.userId}>Assign Shift</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
