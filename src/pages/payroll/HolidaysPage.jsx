import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { downloadBlob, payrollApi } from '../../api/payrollApi';
import { ConfirmDialog, DataTable, PageShell } from './components/PayrollShell';

export default function HolidaysPage() {
  const year = new Date().getFullYear();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ holidayName: '', date: '', type: 'National' });
  const [delId, setDelId] = useState(null);

  const load = () => payrollApi.listHolidays(year).then((r) => setRows(r.data.data || []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (edit) await payrollApi.updateHoliday(edit._id, form);
    else await payrollApi.createHoliday(form);
    setOpen(false);
    load();
  };

  const downloadTemplate = async () => {
    const res = await payrollApi.holidayTemplate();
    downloadBlob(res.data, 'holiday-template.xlsx');
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await payrollApi.uploadHolidays(file);
    e.target.value = '';
    load();
  };

  return (
    <PageShell title="Holidays" subtitle="National / Festival / Optional — week-off wins over holiday in attendance"
      actions={
        <>
          <Button variant="secondary" onClick={downloadTemplate}>Template</Button>
          <label className="inline-flex cursor-pointer items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
            Upload Excel
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onUpload} />
          </label>
          <Link to="/payroll/holidays/upload-logs"><Button variant="outline">Upload Logs</Button></Link>
          <Button onClick={() => { setEdit(null); setForm({ holidayName: '', date: '', type: 'National' }); setOpen(true); }}>Add Holiday</Button>
        </>
      }>
      <Card>
        <DataTable
          columns={[
            { key: 'holidayName', label: 'Name' },
            { key: 'date', label: 'Date', render: (r) => String(r.date).slice(0, 10) },
            { key: 'type', label: 'Type' },
            {
              key: 'a', label: '', render: (r) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setEdit(r); setForm({ holidayName: r.holidayName, date: String(r.date).slice(0, 10), type: r.type }); setOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => setDelId(r._id)}>Delete</Button>
                </div>
              )
            }
          ]}
          rows={rows}
        />
      </Card>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={edit ? 'Edit Holiday' : 'Add Holiday'}
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        <div className="space-y-3">
          <Input label="Name" value={form.holidayName} onChange={(e) => setForm({ ...form, holidayName: e.target.value })} />
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <label className="block text-sm">
            <span className="text-slate-600">Type</span>
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['National', 'Festival', 'Optional'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} title="Delete holiday?" message="This cannot be undone." danger confirmLabel="Delete"
        onClose={() => setDelId(null)}
        onConfirm={async () => { await payrollApi.deleteHoliday(delId); setDelId(null); load(); }} />
    </PageShell>
  );
}

export function HolidayUploadLogsPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { payrollApi.holidayUploadLogs().then((r) => setRows(r.data.data || [])); }, []);
  return (
    <PageShell title="Holiday Upload Logs">
      <Card>
        <DataTable
          columns={[
            { key: 'fileName', label: 'File' },
            { key: 'uploadStatus', label: 'Status' },
            { key: 'successCount', label: 'OK' },
            { key: 'failCount', label: 'Fail' },
            { key: 'createdAt', label: 'When', render: (r) => new Date(r.createdAt).toLocaleString() }
          ]}
          rows={rows}
        />
      </Card>
    </PageShell>
  );
}
