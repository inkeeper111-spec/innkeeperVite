import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { payrollApi } from '../../api/payrollApi';
import { PageShell } from './components/PayrollShell';

const empty = {
  basicPercent: 40,
  earnings: [{ type: 'HRA', isActive: true }, { type: 'Special Allowance', isActive: true }],
  deductions: [{ type: 'Uniform', isActive: true }],
  pfPercent: 12,
  pfActive: true,
  esiPercent: 0.75,
  esiActive: true,
  professionTax: { mode: 'FIXED', fixedAmount: 200, slabs: [] }
};

export default function StatutoryDeductionsPage() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    payrollApi.getTaxConfig()
      .then((r) => { if (r.data.data) setForm({ ...empty, ...r.data.data }); })
      .finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    await payrollApi.saveTaxConfig(form);
  };

  const updateList = (key, idx, patch) => {
    const list = [...(form[key] || [])];
    list[idx] = { ...list[idx], ...patch };
    setForm({ ...form, [key]: list });
  };

  return (
    <PageShell title="Salary Breakdown / Statutory" subtitle="Earnings, deductions, PF, ESI, and Professional Tax (FIXED or SLAB)">
      <Card>
        {loading ? <p className="text-sm text-slate-500">Loading…</p> : (
          <form className="space-y-6" onSubmit={save}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Basic %" type="number" value={form.basicPercent}
                onChange={(e) => setForm({ ...form, basicPercent: Number(e.target.value) })} />
              <Input label="PF %" type="number" step="0.01" value={form.pfPercent}
                onChange={(e) => setForm({ ...form, pfPercent: Number(e.target.value) })} />
              <Input label="ESI %" type="number" step="0.01" value={form.esiPercent}
                onChange={(e) => setForm({ ...form, esiPercent: Number(e.target.value) })} />
            </div>
            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.pfActive}
                onChange={(e) => setForm({ ...form, pfActive: e.target.checked })} /> PF active</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.esiActive}
                onChange={(e) => setForm({ ...form, esiActive: e.target.checked })} /> ESI active</label>
            </div>

            {['earnings', 'deductions'].map((key) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold capitalize">{key}</h3>
                  <Button type="button" variant="secondary" size="sm"
                    onClick={() => setForm({ ...form, [key]: [...(form[key] || []), { type: '', isActive: true }] })}>
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {(form[key] || []).map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={item.type}
                        onChange={(e) => updateList(key, idx, { type: e.target.value })}
                        placeholder="Type name" />
                      <label className="text-xs flex items-center gap-1">
                        <input type="checkbox" checked={item.isActive !== false}
                          onChange={(e) => updateList(key, idx, { isActive: e.target.checked })} /> Active
                      </label>
                      <Button type="button" variant="secondary" size="sm"
                        onClick={() => setForm({ ...form, [key]: form[key].filter((_, i) => i !== idx) })}>Remove</Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <h3 className="font-semibold mb-2">Professional Tax</h3>
              <div className="flex gap-4 mb-3 text-sm">
                {['FIXED', 'SLAB'].map((mode) => (
                  <label key={mode} className="flex items-center gap-2">
                    <input type="radio" checked={form.professionTax.mode === mode}
                      onChange={() => setForm({
                        ...form,
                        professionTax: { ...form.professionTax, mode }
                      })} /> {mode}
                  </label>
                ))}
              </div>
              {form.professionTax.mode === 'FIXED' ? (
                <Input label="Fixed amount" type="number" value={form.professionTax.fixedAmount || 0}
                  onChange={(e) => setForm({
                    ...form,
                    professionTax: { ...form.professionTax, fixedAmount: Number(e.target.value) }
                  })} />
              ) : (
                <div className="space-y-2">
                  {(form.professionTax.slabs || []).map((slab, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2">
                      <Input label="Min" type="number" value={slab.minSalary}
                        onChange={(e) => {
                          const slabs = [...form.professionTax.slabs];
                          slabs[idx] = { ...slabs[idx], minSalary: Number(e.target.value) };
                          setForm({ ...form, professionTax: { ...form.professionTax, slabs } });
                        }} />
                      <Input label="Max" type="number" value={slab.maxSalary}
                        onChange={(e) => {
                          const slabs = [...form.professionTax.slabs];
                          slabs[idx] = { ...slabs[idx], maxSalary: Number(e.target.value) };
                          setForm({ ...form, professionTax: { ...form.professionTax, slabs } });
                        }} />
                      <Input label="Tax" type="number" value={slab.taxAmount}
                        onChange={(e) => {
                          const slabs = [...form.professionTax.slabs];
                          slabs[idx] = { ...slabs[idx], taxAmount: Number(e.target.value) };
                          setForm({ ...form, professionTax: { ...form.professionTax, slabs } });
                        }} />
                      <Button type="button" variant="secondary" className="self-end"
                        onClick={() => setForm({
                          ...form,
                          professionTax: {
                            ...form.professionTax,
                            slabs: form.professionTax.slabs.filter((_, i) => i !== idx)
                          }
                        })}>Remove</Button>
                    </div>
                  ))}
                  <Button type="button" variant="secondary" size="sm"
                    onClick={() => setForm({
                      ...form,
                      professionTax: {
                        ...form.professionTax,
                        slabs: [...(form.professionTax.slabs || []), { minSalary: 0, maxSalary: 0, taxAmount: 0 }]
                      }
                    })}>Add slab</Button>
                </div>
              )}
            </div>

            <Button type="submit">Save Statutory Config</Button>
          </form>
        )}
      </Card>
    </PageShell>
  );
}
