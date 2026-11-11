import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MonthPicker } from '../../components/ui/MonthPicker';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { downloadBlob, payrollApi, previousMonth } from '../../api/payrollApi';
import { DataTable, PageShell, StaffSelectField, onMonthChange } from './components/PayrollShell';

export default function PayslipsPage() {
  const { employeeId } = useParams();
  const [params] = useSearchParams();
  const [monthYear, setMonthYear] = useState(params.get('month') || previousMonth());
  const [staffId, setStaffId] = useState(employeeId || '');
  const [staff, setStaff] = useState([]);
  const [record, setRecord] = useState(null);
  const [list, setList] = useState([]);

  useEffect(() => {
    payrollApi.staffData().then((r) => setStaff(r.data.data || []));
  }, []);

  useEffect(() => {
    if (employeeId) setStaffId(employeeId);
  }, [employeeId]);

  useEffect(() => {
    payrollApi.payrollDetails(monthYear).then((r) => setList(r.data.data?.records || []));
  }, [monthYear]);

  useEffect(() => {
    if (!staffId) { setRecord(null); return; }
    payrollApi.payrollByStaff({ staffId, monthYear }).then((r) => {
      setRecord((r.data.data || [])[0] || null);
    });
  }, [staffId, monthYear]);

  const downloadPdf = async () => {
    const res = await payrollApi.downloadPayslip(staffId, monthYear);
    downloadBlob(res.data, `payslip-${monthYear}.pdf`);
  };

  return (
    <PageShell title="Payslips" subtitle="Preview breakdown and download PDF"
      actions={<MonthPicker value={monthYear} onChange={onMonthChange(setMonthYear)} />}>
      <Card title="Select employee">
        <StaffSelectField staff={staff} value={staffId} onChange={setStaffId} />
      </Card>

      {record ? (
        <Card title={`Payslip ${monthYear}`} action={<Button onClick={downloadPdf}>Download PDF</Button>}>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="font-semibold mb-2">Earnings</p>
              <ul className="space-y-1">
                <li>Gross: {record.grossSalary}</li>
                <li>Basic: {record.basicSalary}</li>
                <li>Allowances: {record.allowanceSalary}</li>
                {(record.earnings || []).map((e) => <li key={e.type}>{e.type}: {e.amount}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">Deductions</p>
              <ul className="space-y-1">
                <li>PF: {record.pf}</li>
                <li>ESI: {record.esi}</li>
                <li>Profession Tax: {record.professionTax}</li>
                <li>Leave deduction (info): {record.leaveDeduction}</li>
                {(record.deductions || []).map((d) => <li key={d.type}>{d.type}: {d.amount}</li>)}
                <li>Advance: {record.advancePayment}</li>
                <li className="font-bold pt-2">Net: {record.netSalary}</li>
              </ul>
            </div>
          </div>
        </Card>
      ) : (
        <Card><p className="text-sm text-slate-500">No payslip for this staff/month. Run payroll first.</p></Card>
      )}

      <Card title="Period roster">
        <DataTable
          columns={[
            { key: 'name', label: 'Staff', render: (r) => (
              <button className="text-teal-700 font-medium" onClick={() => setStaffId(r.staffId?._id || r.staffId)}>
                {r.userId?.name}
              </button>
            ) },
            { key: 'netSalary', label: 'Net' },
            {
              key: 'pdf', label: '',
              render: (r) => (
                <Button size="sm" variant="secondary" onClick={async () => {
                  const id = r.staffId?._id || r.staffId;
                  downloadBlob((await payrollApi.downloadPayslip(id, monthYear)).data, `payslip-${id}-${monthYear}.pdf`);
                }}>PDF</Button>
              )
            }
          ]}
          rows={list}
        />
      </Card>
    </PageShell>
  );
}
