import React, { useEffect, useState } from 'react';
import { MonthPicker } from '../../components/ui/MonthPicker';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { downloadBlob, payrollApi, previousMonth } from '../../api/payrollApi';
import { DataTable, PageShell, onMonthChange } from './components/PayrollShell';

export default function PayrollReportsPage() {
  const [monthYear, setMonthYear] = useState(previousMonth());
  const [details, setDetails] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    Promise.all([
      payrollApi.payrollDetails(monthYear),
      payrollApi.getExportConfig()
    ]).then(([d, c]) => {
      setDetails(d.data.data);
      setConfig(c.data.data);
    });
  }, [monthYear]);

  const download = async () => {
    const res = await payrollApi.downloadExcel(monthYear);
    const ext = config?.fileType === 'pdf' ? 'pdf' : config?.fileType === 'txt' ? 'txt' : 'xlsx';
    downloadBlob(res.data, `payroll-report-${monthYear}.${ext}`);
  };

  return (
    <PageShell title="Payroll Reports" subtitle="Period table + config-driven Excel/PDF/TXT download"
      actions={
        <>
          <MonthPicker value={monthYear} onChange={onMonthChange(setMonthYear)} />
          <Button onClick={download}>Download ({config?.fileType || 'excel'})</Button>
          <Button variant="secondary" onClick={async () =>
            downloadBlob((await payrollApi.downloadExcelFull(monthYear)).data, `payroll-full-${monthYear}.xlsx`)
          }>Full Structure</Button>
        </>
      }>
      <Card title={`Register ${monthYear}`} subtitle={`Using file configuration: ${config?.fileType || 'excel'}`}>
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
            { key: 'advancePayment', label: 'Advance' },
            { key: 'netSalary', label: 'Net' }
          ]}
          rows={details?.records || []}
        />
      </Card>
    </PageShell>
  );
}
