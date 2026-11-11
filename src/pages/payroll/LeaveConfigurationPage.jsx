import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { payrollApi } from '../../api/payrollApi';
import { PageShell } from './components/PayrollShell';

export default function LeaveConfigurationPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ PL: 12, SL: 6, EL: 12, CL: 6 });

  useEffect(() => {
    payrollApi.getLeaveConfig(year).then((r) => {
      if (r.data.data) setForm({
        PL: r.data.data.PL, SL: r.data.data.SL, EL: r.data.data.EL, CL: r.data.data.CL || 0
      });
    });
  }, [year]);

  const save = async (e) => {
    e.preventDefault();
    await payrollApi.saveLeaveConfig({ year, ...form });
  };

  return (
    <PageShell title="Leave Configuration" subtitle="Annual PL / SL / EL / CL quotas. Attendance save rejects overshoot vs YTD usage.">
      <Card>
        <form className="grid gap-4 max-w-xl sm:grid-cols-2" onSubmit={save}>
          <Input label="Year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          {['PL', 'SL', 'EL', 'CL'].map((k) => (
            <Input key={k} label={`${k} annual quota`} type="number" value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} />
          ))}
          <div className="sm:col-span-2"><Button type="submit">Save Leave Quotas</Button></div>
        </form>
      </Card>
    </PageShell>
  );
}
