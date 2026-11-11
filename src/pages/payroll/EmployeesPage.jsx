import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { downloadBlob, payrollApi } from '../../api/payrollApi';
import { DataTable, PageShell } from './components/PayrollShell';

const blank = {
  staffId: '', wages: 'M', salary: 0, basic: 0, allowances: 0,
  earnings: [], deductions: [],
  bank: { accountName: '', accountNo: '', IFSC: '' },
  pfEligible: 'N', pfNo: '', esiEligible: 'N', esiNo: '', UANNo: '', weekOff: '', isActive: true
};

export default function EmployeesPage() {
  const [rows, setRows] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [weekoffs, setWeekoffs] = useState([]);
  const [tax, setTax] = useState(null);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(blank);

  const load = async () => {
    const [sal, staff, wo, taxRes] = await Promise.all([
      payrollApi.listStaffSalary(),
      payrollApi.staffData(),
      payrollApi.listWeekoff(),
      payrollApi.getTaxConfig()
    ]);
    setRows(sal.data.data || []);
    setProfiles(staff.data.data || []);
    setWeekoffs(wo.data.data || []);
    setTax(taxRes.data.data);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    const earnings = (tax?.earnings || []).filter((e) => e.isActive !== false).map((e) => ({ type: e.type, amount: 0 }));
    const deductions = (tax?.deductions || []).filter((d) => d.isActive !== false).map((d) => ({ type: d.type, amount: 0 }));
    setEdit(null);
    setForm({ ...blank, earnings, deductions });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEdit(row);
    setForm({
      staffId: row.staffId?._id || row.staffId,
      wages: row.wages,
      salary: row.salary,
      basic: row.basic,
      allowances: row.allowances,
      earnings: row.earnings || [],
      deductions: row.deductions || [],
      bank: row.bank || blank.bank,
      pfEligible: row.pfEligible,
      pfNo: row.pfNo,
      esiEligible: row.esiEligible,
      esiNo: row.esiNo,
      UANNo: row.UANNo,
      weekOff: row.weekOff?._id || row.weekOff || '',
      isActive: row.isActive
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = { ...form, weekOff: form.weekOff || null };
    if (edit) await payrollApi.updateStaffSalary(edit._id, payload);
    else await payrollApi.addStaffSalary(payload);
    setOpen(false);
    load();
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await payrollApi.uploadStaffSalary(file);
    e.target.value = '';
    load();
  };

  const withoutSalary = profiles.filter((p) => !rows.some((r) => String(r.staffId?._id || r.staffId) === String(p._id)));

  return (
    <PageShell title="Employees / Staff Salary" subtitle="Bank, PF/ESI/UAN, dynamic earnings/deductions, week-off, bulk Excel"
      actions={
        <>
          <Button variant="secondary" onClick={async () => downloadBlob((await payrollApi.staffTemplate()).data, 'staff-salary-template.xlsx')}>Template</Button>
          <label className="inline-flex cursor-pointer items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
            Upload
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onUpload} />
          </label>
          <Link to="/payroll/employees/upload-logs"><Button variant="outline">Upload Logs</Button></Link>
          <Button onClick={openNew}>Add Salary Setup</Button>
        </>
      }>
      <Card>
        <DataTable
          columns={[
            { key: 'emp', label: 'Employee', render: (r) => r.userId?.name || r.staffId?.employeeId },
            { key: 'wages', label: 'Wages' },
            { key: 'salary', label: 'Salary' },
            { key: 'basic', label: 'Basic' },
            { key: 'pfEligible', label: 'PF' },
            { key: 'esiEligible', label: 'ESI' },
            { key: 'weekOff', label: 'Week-off', render: (r) => r.weekOff?.categoryName || '—' },
            { key: 'a', label: '', render: (r) => <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button> }
          ]}
          rows={rows}
        />
      </Card>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={edit ? 'Update Staff Salary' : 'Add Staff Salary'} maxWidth="max-w-3xl"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          {!edit && (
            <label className="text-sm sm:col-span-2">
              Staff
              <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.staffId}
                onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
                <option value="">Select</option>
                {withoutSalary.map((p) => (
                  <option key={p._id} value={p._id}>{p.userId?.name} ({p.employeeId})</option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm">Wages
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.wages}
              onChange={(e) => setForm({ ...form, wages: e.target.value })}>
              <option value="M">Monthly (M)</option>
              <option value="D">Daily (D)</option>
            </select>
          </label>
          <Input label="Gross salary" type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} />
          <Input label="Basic" type="number" value={form.basic} onChange={(e) => setForm({ ...form, basic: Number(e.target.value) })} />
          <Input label="Allowances" type="number" value={form.allowances} onChange={(e) => setForm({ ...form, allowances: Number(e.target.value) })} />
          {tax?.basicPercent > 0 && (
            <p className="sm:col-span-2 text-xs text-amber-700">basicPercent={tax.basicPercent}% → expected basic {Math.round(form.salary * tax.basicPercent / 100)}</p>
          )}
          <label className="text-sm">Week-off category
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.weekOff}
              onChange={(e) => setForm({ ...form, weekOff: e.target.value })}>
              <option value="">None</option>
              {weekoffs.map((w) => <option key={w._id} value={w._id}>{w.categoryName}</option>)}
            </select>
          </label>
          <label className="text-sm">PF Eligible
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.pfEligible}
              onChange={(e) => setForm({ ...form, pfEligible: e.target.value })}>
              <option value="Y">Y</option><option value="N">N</option>
            </select>
          </label>
          <Input label="PF No" value={form.pfNo} onChange={(e) => setForm({ ...form, pfNo: e.target.value })} />
          <label className="text-sm">ESI Eligible
            <select className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" value={form.esiEligible}
              onChange={(e) => setForm({ ...form, esiEligible: e.target.value })}>
              <option value="Y">Y</option><option value="N">N</option>
            </select>
          </label>
          <Input label="ESI No" value={form.esiNo} onChange={(e) => setForm({ ...form, esiNo: e.target.value })} />
          <Input label="UAN" value={form.UANNo} onChange={(e) => setForm({ ...form, UANNo: e.target.value })} />
          <Input label="Account name" value={form.bank.accountName} onChange={(e) => setForm({ ...form, bank: { ...form.bank, accountName: e.target.value } })} />
          <Input label="Account no" value={form.bank.accountNo} onChange={(e) => setForm({ ...form, bank: { ...form.bank, accountNo: e.target.value } })} />
          <Input label="IFSC" value={form.bank.IFSC} onChange={(e) => setForm({ ...form, bank: { ...form.bank, IFSC: e.target.value } })} />

          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Earnings (prorated)</p>
            {(form.earnings || []).map((e, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input className="flex-1 rounded-lg border px-3 py-2 text-sm" value={e.type} readOnly />
                <input type="number" className="w-32 rounded-lg border px-3 py-2 text-sm" value={e.amount}
                  onChange={(ev) => {
                    const earnings = [...form.earnings];
                    earnings[idx] = { ...earnings[idx], amount: Number(ev.target.value) };
                    setForm({ ...form, earnings });
                  }} />
              </div>
            ))}
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Deductions (fixed monthly)</p>
            {(form.deductions || []).map((d, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input className="flex-1 rounded-lg border px-3 py-2 text-sm" value={d.type} readOnly />
                <input type="number" className="w-32 rounded-lg border px-3 py-2 text-sm" value={d.amount}
                  onChange={(ev) => {
                    const deductions = [...form.deductions];
                    deductions[idx] = { ...deductions[idx], amount: Number(ev.target.value) };
                    setForm({ ...form, deductions });
                  }} />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}

export function StaffUploadLogsPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { payrollApi.staffUploadLogs().then((r) => setRows(r.data.data || [])); }, []);
  return (
    <PageShell title="Staff Salary Upload Logs">
      <Card>
        <DataTable columns={[
          { key: 'fileName', label: 'File' },
          { key: 'uploadStatus', label: 'Status' },
          { key: 'successCount', label: 'OK' },
          { key: 'failCount', label: 'Fail' },
          { key: 'createdAt', label: 'When', render: (r) => new Date(r.createdAt).toLocaleString() }
        ]} rows={rows} />
      </Card>
    </PageShell>
  );
}
