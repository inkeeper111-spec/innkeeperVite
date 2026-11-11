import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MonthPicker } from '../../components/ui/MonthPicker';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { downloadBlob, payrollApi, previousMonth } from '../../api/payrollApi';
import { ConfirmDialog, CutoffBanner, DataTable, PageShell, onMonthChange } from './components/PayrollShell';

export default function PayrollRunPage() {
  const [monthYear, setMonthYear] = useState(previousMonth());
  const [details, setDetails] = useState(null);
  const [confirmRun, setConfirmRun] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    const r = await payrollApi.payrollDetails(monthYear);
    setDetails(r.data.data);
  };
  useEffect(() => { load(); }, [monthYear]);

  const canRun = details?.cutoff?.status === 'in_window' && details?.periodStatus !== 'inactive';

  const run = async () => {
    setRunning(true);
    try {
      await payrollApi.runPayroll(monthYear);
      setConfirmRun(false);
      await load();
    } finally {
      setRunning(false);
    }
  };

  const togglePeriod = async () => {
    const next = details?.periodStatus === 'inactive' ? 'active' : 'inactive';
    await payrollApi.periodStatus({ monthYear, payrollPeriodStatus: next });
    load();
  };

  return (
    <PageShell title="Payroll Run" subtitle="Run / Re-run monthly payroll. Requires global config, cut-off window, tax config, salary setups, and attendance locks."
      actions={<MonthPicker value={monthYear} onChange={onMonthChange(setMonthYear)} />}>
      <CutoffBanner cutoff={details?.cutoff} />

      <div className="flex flex-wrap gap-2">
        <Button disabled={!canRun || running} onClick={() => setConfirmRun(true)}>
          {running ? 'Running…' : details?.records?.length ? 'Re-run Payroll' : 'Run Payroll'}
        </Button>
        <Button variant="secondary" onClick={togglePeriod}>
          Period: {details?.periodStatus || 'active'} (toggle)
        </Button>
        <Button variant="secondary" onClick={async () => downloadBlob((await payrollApi.downloadExcel(monthYear)).data, `payroll-${monthYear}.xlsx`)}>
          Download Export
        </Button>
        <Button variant="secondary" onClick={async () => downloadBlob((await payrollApi.downloadExcelFull(monthYear)).data, `payroll-full-${monthYear}.xlsx`)}>
          Full Structure Excel
        </Button>
        <Link to="/payroll/payslips"><Button variant="outline">Payslips</Button></Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ['Staff', details?.summary?.staffCount],
          ['Gross', details?.summary?.totalGross],
          ['Net', details?.summary?.totalNet],
          ['Advances', details?.summary?.totalAdvance]
        ].map(([l, v]) => (
          <Card key={l}><p className="text-xs text-slate-500">{l}</p><p className="text-xl font-black">{v ?? 0}</p></Card>
        ))}
      </div>

      <Card title={`Payroll ${monthYear}`}>
        <DataTable
          columns={[
            { key: 'name', label: 'Staff', render: (r) => r.userId?.name },
            { key: 'present', label: 'P' },
            { key: 'leave', label: 'Leave' },
            { key: 'lop', label: 'LOP' },
            { key: 'grossSalary', label: 'Gross' },
            { key: 'pf', label: 'PF' },
            { key: 'esi', label: 'ESI' },
            { key: 'professionTax', label: 'PT' },
            { key: 'advancePayment', label: 'Adv' },
            { key: 'netSalary', label: 'Net' },
            {
              key: 'slip', label: '',
              render: (r) => (
                <Link className="text-teal-700 text-xs font-semibold" to={`/payroll/payslips/${r.staffId?._id || r.staffId}?month=${monthYear}`}>
                  Payslip
                </Link>
              )
            }
          ]}
          rows={details?.records || []}
        />
      </Card>

      <ConfirmDialog
        open={confirmRun}
        title={details?.records?.length ? 'Re-run payroll?' : 'Run payroll?'}
        message="Existing non-config payroll rows for this month will be deleted. Advance breakups will be restored from PayrollBackup then reapplied."
        confirmLabel={running ? 'Running…' : 'Run'}
        onClose={() => setConfirmRun(false)}
        onConfirm={run}
      />
    </PageShell>
  );
}
