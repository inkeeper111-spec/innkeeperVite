import React, { useEffect, useMemo, useState } from 'react';
import { MonthPicker } from '../../components/ui/MonthPicker';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { payrollApi, previousMonth } from '../../api/payrollApi';
import {
  AttendanceCalendar, ConfirmDialog, CutoffBanner, DataTable, PageShell, StaffSelectField, onMonthChange
} from './components/PayrollShell';

export default function AttendancePage() {
  const [monthYear, setMonthYear] = useState(previousMonth());
  const [list, setList] = useState([]);
  const [cutoff, setCutoff] = useState(null);
  const [staffId, setStaffId] = useState('');
  const [days, setDays] = useState([]);
  const [summary, setSummary] = useState(null);
  const [confirmPresent, setConfirmPresent] = useState(false);
  const [saving, setSaving] = useState(false);

  const staffOptions = useMemo(
    () => list.map((r) => ({ _id: r.staffId, employeeId: r.employeeId, name: r.name, userId: { name: r.name } })),
    [list]
  );

  const canEdit = cutoff?.status === 'in_window';

  const loadList = async () => {
    const r = await payrollApi.attendanceList(monthYear);
    setList(r.data.data || []);
    setCutoff(r.data.cutoff);
  };

  useEffect(() => { loadList(); }, [monthYear]);

  const loadStaff = async (id) => {
    if (!id) return;
    const r = await payrollApi.getAttendance(id, monthYear);
    setCutoff(r.data.data.cutoff);
    setSummary(r.data.data.summary);
    const mapped = (r.data.data.rows || []).map((row) => ({
      date: String(row.attendanceDate).slice(0, 10),
      status: row.status
    }));
    setDays(mapped);
  };

  useEffect(() => { if (staffId) loadStaff(staffId); }, [staffId, monthYear]);

  const onChangeDay = (date, status) => {
    setDays((prev) => {
      const rest = prev.filter((d) => d.date !== date);
      if (!status) return rest;
      return [...rest, { date, status }];
    });
  };

  const markAllPresent = () => {
    const [y, m] = monthYear.split('-').map(Number);
    const dim = new Date(y, m, 0).getDate();
    const next = [];
    for (let d = 1; d <= dim; d += 1) {
      const date = `${monthYear}-${String(d).padStart(2, '0')}`;
      const existing = days.find((x) => x.date === date);
      if (existing && ['W', 'H', 'L'].includes(existing.status)) next.push(existing);
      else next.push({ date, status: 'P' });
    }
    setDays(next);
    setConfirmPresent(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await payrollApi.saveAttendance({ staffId, monthYear, days });
      await loadList();
      await loadStaff(staffId);
    } finally {
      setSaving(false);
    }
  };

  const backfill = async () => {
    await payrollApi.weekoffUpdation({ monthYear });
    await loadList();
    if (staffId) await loadStaff(staffId);
  };

  return (
    <PageShell title="Payroll Attendance" subtitle="Month calendar per staff. Save creates attendanceLock (A). Cut-off enforced."
      actions={
        <>
          <MonthPicker value={monthYear} onChange={onMonthChange(setMonthYear)} />
          <Button variant="secondary" onClick={backfill} disabled={!canEdit}>Backfill W/H</Button>
        </>
      }>
      <CutoffBanner cutoff={cutoff} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Staff" className="lg:col-span-1">
          <DataTable
            columns={[
              { key: 'name', label: 'Name', render: (r) => (
                <button className={`text-left ${String(staffId) === String(r.staffId) ? 'font-bold text-teal-700' : ''}`}
                  onClick={() => setStaffId(r.staffId)}>{r.name}</button>
              ) },
              { key: 'locked', label: 'Lock', render: (r) => (r.locked ? 'A' : '—') },
              { key: 'present', label: 'P', render: (r) => r.summary?.present }
            ]}
            rows={list}
          />
        </Card>

        <Card title="Calendar" subtitle={staffId ? `Editing ${monthYear}` : 'Select a staff member'} className="lg:col-span-2"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={!staffId || !canEdit} onClick={() => setConfirmPresent(true)}>Mark all present</Button>
              <Button size="sm" disabled={!staffId || !canEdit || saving} onClick={save}>{saving ? 'Saving…' : 'Save & Lock'}</Button>
            </div>
          }>
          <div className="mb-3">
            <StaffSelectField staff={staffOptions} value={staffId} onChange={setStaffId} />
          </div>
          {staffId ? (
            <>
              <AttendanceCalendar monthYear={monthYear} days={days} onChangeDay={onChangeDay} disabled={!canEdit} />
              {summary && (
                <p className="mt-4 text-xs text-slate-500">
                  Payable days ≈ {summary.payableDays} (P {summary.present} + leave {summary.leave} + W {summary.weekOff} + H {summary.holiday}); LOP {summary.lop}
                </p>
              )}
            </>
          ) : <p className="text-sm text-slate-400">Select staff to edit the month grid.</p>}
        </Card>
      </div>

      <ConfirmDialog open={confirmPresent} title="Mark all present?"
        message="Sets unmarked working days to P. Existing W/H/L kept."
        confirmLabel="Mark present" onClose={() => setConfirmPresent(false)} onConfirm={markAllPresent} />
    </PageShell>
  );
}
