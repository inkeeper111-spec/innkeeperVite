import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { payrollApi } from '../../api/payrollApi';
import { PageShell } from './components/PayrollShell';

export default function FileConfigurationPage() {
  const [form, setForm] = useState({
    fields: [],
    fileType: 'excel',
    format: 'standard',
    isWithoutHeader: false
  });

  useEffect(() => {
    payrollApi.getExportConfig().then((r) => {
      if (r.data.data) setForm(r.data.data);
    });
  }, []);

  const save = async (e) => {
    e.preventDefault();
    await payrollApi.saveExportConfig(form);
  };

  const move = (idx, dir) => {
    const fields = [...form.fields];
    const j = idx + dir;
    if (j < 0 || j >= fields.length) return;
    [fields[idx], fields[j]] = [fields[j], fields[idx]];
    fields.forEach((f, i) => { f.order = i + 1; });
    setForm({ ...form, fields });
  };

  return (
    <PageShell title="File Configuration" subtitle="Export column order/format for reports (excel | pdf | txt)">
      <Card>
        <form className="space-y-4" onSubmit={save}>
          <div className="flex flex-wrap gap-4 text-sm">
            <label>File type
              <select className="ml-2 rounded-lg border px-3 py-2" value={form.fileType}
                onChange={(e) => setForm({ ...form, fileType: e.target.value })}>
                {['excel', 'pdf', 'txt'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.isWithoutHeader}
                onChange={(e) => setForm({ ...form, isWithoutHeader: e.target.checked })} />
              Without header
            </label>
          </div>

          <div className="space-y-2">
            {(form.fields || []).map((f, idx) => (
              <div key={f.key} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <input type="checkbox" checked={f.isActive !== false}
                  onChange={(e) => {
                    const fields = [...form.fields];
                    fields[idx] = { ...f, isActive: e.target.checked };
                    setForm({ ...form, fields });
                  }} />
                <span className="flex-1 font-medium">{f.label}</span>
                <code className="text-xs text-slate-400">{f.key}</code>
                <Button type="button" size="sm" variant="secondary" onClick={() => move(idx, -1)}>↑</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => move(idx, 1)}>↓</Button>
              </div>
            ))}
          </div>
          <Button type="submit">Save Export Config</Button>
        </form>
      </Card>
    </PageShell>
  );
}
