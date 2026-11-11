import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { payrollApi } from '../../api/payrollApi';
import { ConfirmDialog, DataTable, PageShell } from './components/PayrollShell';

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const emptyWeek = () => ({ week1: [], week2: [], week3: [], week4: [], week5: [] });

export default function WeekoffPage() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ categoryName: '', description: '', weekOff: emptyWeek() });
  const [delId, setDelId] = useState(null);

  const load = () => payrollApi.listWeekoff().then((r) => setRows(r.data.data || []));
  useEffect(() => { load(); }, []);

  const toggleDay = (week, day) => {
    const list = form.weekOff[week] || [];
    const next = list.includes(day) ? list.filter((d) => d !== day) : [...list, day];
    setForm({ ...form, weekOff: { ...form.weekOff, [week]: next } });
  };

  const openCreate = () => {
    setEdit(null);
    setForm({ categoryName: '', description: '', weekOff: emptyWeek() });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEdit(row);
    setForm({
      categoryName: row.categoryName,
      description: row.description || '',
      weekOff: { ...emptyWeek(), ...(row.weekOff || {}) }
    });
    setOpen(true);
  };

  const save = async () => {
    if (edit) await payrollApi.updateWeekoff(edit._id, form);
    else await payrollApi.createWeekoff(form);
    setOpen(false);
    load();
  };

  return (
    <PageShell title="Week-off Categories" subtitle="week1–week5 day-name arrays; assign to employees from Employees screen"
      actions={<Button onClick={openCreate}>Add Category</Button>}>
      <Card>
        <DataTable
          columns={[
            { key: 'categoryName', label: 'Name' },
            { key: 'description', label: 'Description' },
            {
              key: 'summary',
              label: 'Week-offs',
              render: (r) => DAYS.filter((d) =>
                Object.values(r.weekOff || {}).some((arr) => (arr || []).includes(d))
              ).join(', ') || '—'
            },
            {
              key: 'actions',
              label: '',
              render: (r) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => setDelId(r._id)}>Delete</Button>
                </div>
              )
            }
          ]}
          rows={rows}
        />
      </Card>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={edit ? 'Edit Week-off' : 'New Week-off'} maxWidth="max-w-3xl"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        <div className="space-y-4">
          <Input label="Category name" value={form.categoryName} onChange={(e) => setForm({ ...form, categoryName: e.target.value })} />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {['week1', 'week2', 'week3', 'week4', 'week5'].map((week) => (
            <div key={week}>
              <p className="text-xs font-semibold uppercase text-slate-500 mb-1">{week}</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const on = (form.weekOff[week] || []).includes(day);
                  return (
                    <button key={day} type="button"
                      className={`rounded-full px-3 py-1 text-xs font-medium border ${on ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600'}`}
                      onClick={() => toggleDay(week, day)}>{day.slice(0, 3)}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} title="Delete category?" message="Employees linked to this category will lose the week-off reference."
        danger confirmLabel="Delete" onClose={() => setDelId(null)}
        onConfirm={async () => { await payrollApi.deleteWeekoff(delId); setDelId(null); load(); }} />
    </PageShell>
  );
}
