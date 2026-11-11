import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { payrollApi } from '../../api/payrollApi';
import { ConfirmDialog, DataTable, PageShell, StaffSelectField } from './components/PayrollShell';

export default function AdvancePaymentsPage() {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [open, setOpen] = useState(false);
  const [delId, setDelId] = useState(null);
  const [form, setForm] = useState({
    staffId: '', advanceAmount: 0, payAmount: 0, effectiveMonth: '', paymentMode: 'cash',
    disbursedDate: new Date().toISOString().slice(0, 10), notes: ''
  });

  const load = async () => {
    const [adv, st] = await Promise.all([payrollApi.listAdvances(), payrollApi.staffData()]);
    setRows(adv.data.data || []);
    setStaff(st.data.data || []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    await payrollApi.createAdvance(form);
    setOpen(false);
    load();
  };

  return (
    <PageShell title="Advance Payments" subtitle="Single or multi-month recovery breakups (N/P/Y). Re-run restores via PayrollBackup."
      actions={<Button onClick={() => setOpen(true)}>New Advance</Button>}>
      <Card>
        <DataTable
          columns={[
            { key: 'name', label: 'Staff', render: (r) => r.userId?.name || r.staffId?.employeeId },
            { key: 'advanceAmount', label: 'Amount' },
            { key: 'payAmount', label: 'Installment' },
            { key: 'effectiveMonth', label: 'From' },
            {
              key: 'breakups', label: 'Breakups',
              render: (r) => (r.breakups || []).map((b) => `${b.payMonth}:${b.isPaid}`).join(' · ')
            },
            {
              key: 'a', label: '',
              render: (r) => <Button size="sm" variant="danger" onClick={() => setDelId(r._id)}>Delete</Button>
            }
          ]}
          rows={rows}
        />
      </Card>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Create Advance"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Create</Button></>}>
        <div className="space-y-3">
          <StaffSelectField staff={staff} value={form.staffId} onChange={(v) => setForm({ ...form, staffId: v })} />
          <Input label="Advance amount" type="number" value={form.advanceAmount}
            onChange={(e) => setForm({ ...form, advanceAmount: Number(e.target.value) })} />
          <Input label="Monthly recovery (payAmount)" type="number" value={form.payAmount}
            onChange={(e) => setForm({ ...form, payAmount: Number(e.target.value) })} />
          <Input label="Effective month" type="month" value={form.effectiveMonth}
            onChange={(e) => setForm({ ...form, effectiveMonth: e.target.value })} />
          <Input label="Disbursed date" type="date" value={form.disbursedDate}
            onChange={(e) => setForm({ ...form, disbursedDate: e.target.value })} />
          <label className="text-sm block">Payment mode
            <select className="mt-1 w-full rounded-lg border px-3 py-2" value={form.paymentMode}
              onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
              {['cash', 'bank_transfer', 'cheque', 'upi'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} title="Delete advance?" message="Only allowed if no recovery started."
        danger confirmLabel="Delete" onClose={() => setDelId(null)}
        onConfirm={async () => { await payrollApi.deleteAdvance(delId); setDelId(null); load(); }} />
    </PageShell>
  );
}
