import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { payrollApi } from '../../api/payrollApi';
import { PageShell } from './components/PayrollShell';

export default function GlobalConfigurationPage() {
  const [form, setForm] = useState({ attendanceCutoffDay: 10, payrollCutoffDay: 10 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    payrollApi.getGlobalConfig()
      .then((r) => {
        if (r.data.data) {
          setForm({
            attendanceCutoffDay: r.data.data.attendanceCutoffDay,
            payrollCutoffDay: r.data.data.payrollCutoffDay
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await payrollApi.saveGlobalConfig(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Global Configuration"
      subtitle="Mandatory cut-off days. Attendance edit and payroll run are allowed only in the next month, days 1 through the cut-off day."
    >
      <Card title="Cut-off Days" subtitle="Both values required before payroll operations">
        {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
          <form className="grid gap-4 max-w-lg sm:grid-cols-2" onSubmit={save}>
            <Input
              label="Attendance cut-off day"
              type="number"
              min={1}
              max={31}
              value={form.attendanceCutoffDay}
              onChange={(e) => setForm({ ...form, attendanceCutoffDay: Number(e.target.value) })}
              required
            />
            <Input
              label="Payroll cut-off day"
              type="number"
              min={1}
              max={31}
              value={form.payrollCutoffDay}
              onChange={(e) => setForm({ ...form, payrollCutoffDay: Number(e.target.value) })}
              required
            />
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500 mb-3">
                Example: for period 2026-01 with cut-off 10, the window is 2026-02-01 through 2026-02-10.
              </p>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Configuration'}</Button>
            </div>
          </form>
        )}
      </Card>
    </PageShell>
  );
}
