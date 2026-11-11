import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { downloadBlob, payrollApi, previousMonth } from '../../api/payrollApi';
import { PageShell, CutoffBanner, DataTable } from './components/PayrollShell';

const COLORS = ['#059669', '#e11d48', '#7c3aed'];

export default function PayrollDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    payrollApi.dashboard()
      .then((r) => setData(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const downloadBank = async () => {
    const month = data?.kpis?.previewMonth || previousMonth();
    const res = await payrollApi.downloadExcel(month);
    downloadBlob(res.data, `bank-transfer-${month}.xlsx`);
  };

  if (loading) return <PageShell title="Payroll Dashboard"><p className="text-sm text-slate-500">Loading…</p></PageShell>;

  const att = [
    { name: 'Present', value: data?.attendanceChart?.present || 0 },
    { name: 'Absent/LOP', value: data?.attendanceChart?.absent || 0 },
    { name: 'Leave', value: data?.attendanceChart?.leave || 0 }
  ];

  return (
    <PageShell
      title="Payroll Dashboard"
      subtitle="KPIs, six-month expense trend, attendance mix, and bank export"
      actions={
        <>
          <Button variant="secondary" onClick={downloadBank}>Bank / Payroll Export</Button>
          <Link to="/payroll/run"><Button>Open Payroll Run</Button></Link>
        </>
      }
    >
      <CutoffBanner cutoff={data?.cutoff} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Active Staff', data?.kpis?.activeStaff],
          ['Last Month Net', data?.kpis?.lastMonthNet?.toLocaleString()],
          ['Last Month Gross', data?.kpis?.lastMonthGross?.toLocaleString()],
          ['Staff Paid', data?.kpis?.lastMonthStaffPaid]
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{value ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Period {data?.kpis?.previewMonth}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Previous 6 Months Expense" subtitle="Net salary totals">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.sixMonthExpense || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthYear" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="totalExpense" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Attendance Mix" subtitle={data?.attendanceChart?.monthYear}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={att} dataKey="value" nameKey="name" outerRadius={90} label>
                  {att.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Payroll Preview" subtitle={`Recent rows for ${data?.kpis?.previewMonth}`} action={
        <Link to="/payroll/run" className="text-sm font-semibold text-teal-700">View all</Link>
      }>
        <DataTable
          columns={[
            { key: 'name', label: 'Staff', render: (r) => r.userId?.name || '—' },
            { key: 'grossSalary', label: 'Gross' },
            { key: 'netSalary', label: 'Net' },
            { key: 'advancePayment', label: 'Advance' }
          ]}
          rows={data?.preview || []}
        />
      </Card>
    </PageShell>
  );
}
