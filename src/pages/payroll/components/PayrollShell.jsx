import { PaginatedTable } from '../../../components/ui/PaginatedTable';
import React from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

/** MonthPicker emits { target: { value: 'YYYY-MM' } } */
export const onMonthChange = (setter) => (e) => {
  const value = typeof e === 'string' ? e : e?.target?.value;
  if (value) setter(value);
};

export function PageShell({ title, subtitle, actions, children }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function CutoffBanner({ cutoff, configPath = '/payroll/global-configuration' }) {
  if (!cutoff) return null;
  if (cutoff.status === 'config_missing') {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Global Configuration is required before attendance edit or payroll run.{' '}
        <Link className="font-semibold underline" to={configPath}>Open Global Configuration</Link>
      </div>
    );
  }
  if (cutoff.status === 'in_window') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Cut-off window open until <strong>{cutoff.windowEnd}</strong>.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      {cutoff.message} Save/Run is disabled outside the window.{' '}
      <Link className="font-semibold underline" to={configPath}>Review cut-off days</Link>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onClose, danger }) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}

export function StaffSelectField({ staff, value, onChange, className = '' }) {
  return (
    <select
      className={`rounded-lg border border-slate-200 px-3 py-2 text-sm ${className}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select staff</option>
      {(staff || []).map((s) => (
        <option key={s._id || s.staffId} value={s._id || s.staffId}>
          {s.userId?.name || s.name || s.employeeId} ({s.employeeId})
        </option>
      ))}
    </select>
  );
}

const STATUS_COLORS = {
  P: 'bg-emerald-100 text-emerald-800',
  L: 'bg-rose-100 text-rose-800',
  A: 'bg-rose-100 text-rose-800',
  W: 'bg-slate-100 text-slate-700',
  H: 'bg-sky-100 text-sky-800',
  EL: 'bg-violet-100 text-violet-800',
  PL: 'bg-indigo-100 text-indigo-800',
  SL: 'bg-amber-100 text-amber-800',
  CL: 'bg-orange-100 text-orange-800'
};

export function AttendanceCalendar({ monthYear, days, onChangeDay, disabled }) {
  const [y, m] = (monthYear || '').split('-').map(Number);
  if (!y || !m) return null;
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDow = new Date(y, m - 1, 1).getDay();
  const byDate = Object.fromEntries((days || []).map((d) => [d.date, d.status]));

  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${monthYear}-${String(day).padStart(2, '0')}`;
    cells.push({ day, date, status: byDate[date] || '' });
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
        <div key={d} className="text-center text-[10px] font-semibold uppercase text-slate-400">{d}</div>
      ))}
      {cells.map((c, idx) => (
        <div key={idx} className="min-h-[64px]">
          {c && (
            <div className={`rounded-lg border border-slate-200 p-1.5 ${STATUS_COLORS[c.status] || 'bg-white'}`}>
              <div className="text-[11px] font-semibold">{c.day}</div>
              <select
                disabled={disabled}
                className="mt-1 w-full rounded border-0 bg-transparent text-[11px] focus:ring-0"
                value={c.status || ''}
                onChange={(e) => onChangeDay?.(c.date, e.target.value)}
              >
                <option value="">—</option>
                {['P', 'L', 'EL', 'PL', 'SL', 'CL', 'W', 'H', 'A'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function DataTable({ columns, rows, empty = 'No records' }) {
  return (
    <div className="overflow-x-auto">
      <PaginatedTable tableClassName="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            {columns.map((c) => <th key={c.key} className="px-3 py-2 font-semibold">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {!rows?.length ? (
            <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-400">{empty}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={row.id || row._id || i} className="border-b border-slate-100">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2.5 align-middle">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </PaginatedTable>
    </div>
  );
}
