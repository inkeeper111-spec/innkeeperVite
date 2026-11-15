import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  ReceiptText,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react';
import api, { showApiErrorToast } from '../../api/axios';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';
import { useNavigate } from 'react-router-dom';

const formatDate = (date, timeZone, options) => {
  if (!date) return '—';
  return new Intl.DateTimeFormat(undefined, { timeZone, ...options }).format(new Date(date));
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const statusClass = (status) => {
  if (status === 'paid' || status === 'served') return 'bg-emerald-50 text-emerald-700';
  if (status === 'cancelled' || status === 'refunded') return 'bg-rose-50 text-rose-700';
  if (status === 'partially_paid') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
};

const moneyOrPending = (amount, day) => (
  day?.summary?.foodCostStatus === 'pending' && amount === null
    ? 'Awaiting cost'
    : amount === null || amount === undefined
      ? 'Awaiting cost'
      : null
);

export const RestaurantBillingPage = () => {
  const { hotel, user } = useAuth();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const timeZone = report?.timeZone || hotel?.timezone || 'UTC';
  const [tab, setTab] = useState('today');
  const [expandedDate, setExpandedDate] = useState('');
  const [expandedSalesDate, setExpandedSalesDate] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReport = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get('/restaurant/billing-history');
      setReport(data.data);
    } catch (error) {
      showApiErrorToast(error, 'Could not load restaurant billing history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadReport(true);
    }, 30000);
    const onFocus = () => loadReport(true);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadReport]);

  const previousDays = report?.previousDays || [];
  const hiddenReports = report?.hiddenReports || [];
  const today = report?.today;
  const isHotelAdmin = user?.role === 'hotel_admin';
  const isProductAdmin = user?.role === 'super_admin';

  const hideDayReport = async (day) => {
    if (!window.confirm(`Hide the ${day.date} report from Previous Days’ Bills? The bills and financial data will remain in the database.`)) return;
    try {
      await api.post(`/restaurant/billing-history/${day.date}/hide`);
      await loadReport(true);
    } catch (error) {
      showApiErrorToast(error, 'Could not hide this daily report');
    }
  };

  const requestRestore = async (reportEntry) => {
    const reason = window.prompt(`Why should the ${reportEntry.date} report be restored?`);
    if (reason === null) return;
    if (!reason.trim()) {
      showApiErrorToast(new Error('A reason is required.'), 'Enter a reason to request report restoration');
      return;
    }
    try {
      await api.post(`/restaurant/billing-history/${reportEntry.date}/restore-requests`, { reason: reason.trim() });
      await loadReport(true);
    } catch (error) {
      showApiErrorToast(error, 'Could not request report restoration');
    }
  };

  const reviewRestoreRequest = async (restoreRequest, decision) => {
    const decisionLabel = decision === 'approve' ? 'restore' : 'reject';
    if (!window.confirm(`Are you sure you want to ${decisionLabel} the ${restoreRequest.reportDate} report request?`)) return;
    try {
      await api.patch(`/restaurant/billing-history/restore-requests/${restoreRequest._id}`, { decision });
      await loadReport(true);
    } catch (error) {
      showApiErrorToast(error, `Could not ${decisionLabel} report restoration`);
    }
  };
  const printBill = (bill) => {
    const rows = (bill.items || []).map((item) => `<tr>
      <td>${escapeHtml(item.name)}</td><td>${Number(item.quantity || 0)}</td>
      <td>${escapeHtml(formatCurrency(item.unitPriceSnapshot ?? item.unitPrice ?? 0))}</td>
      <td>${escapeHtml(formatCurrency(item.amount || 0))}</td></tr>`).join('');
    const customer = bill.guestName || bill.customerName || '';
    const content = `<!doctype html><html><head><title>${escapeHtml(bill.orderNumber)}</title>
      <style>body{font:14px Arial,sans-serif;margin:32px;color:#172033}h1{margin-bottom:4px}
      p{color:#64748b}table{width:100%;border-collapse:collapse;margin:24px 0}
      th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left}
      .total{font-weight:bold;font-size:18px;text-align:right}</style></head><body>
      <h1>Restaurant bill ${escapeHtml(bill.orderNumber)}</h1>
      <p>${escapeHtml(formatDate(bill.createdAt, timeZone, { dateStyle: 'medium', timeStyle: 'short' }))}</p>
      <p>Table: ${escapeHtml(bill.tableNumber || bill.tableNameSnapshot || bill.tableId?.tableNumber || '—')}
      &nbsp; | &nbsp; Dining: ${escapeHtml(bill.diningType === 'ac' ? 'AC' : 'Non-AC')}
      &nbsp; | &nbsp; Customer: ${escapeHtml(customer || '—')}</p>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <p>Subtotal: ${escapeHtml(formatCurrency(bill.subtotal || 0))}</p>
      <p>Discount: ${escapeHtml(formatCurrency(bill.discountAmount || 0))}</p>
      <p>Tax: ${escapeHtml(formatCurrency(bill.taxAmount || 0))}</p>
      <p class="total">Total: ${escapeHtml(formatCurrency(bill.totalAmount || 0))}</p>
      <p>Payment: ${escapeHtml(bill.paymentMethod || bill.paymentStatus || 'unpaid')}</p>
      <script>window.onload=()=>window.print()</script></body></html>`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.dispatchEvent(new CustomEvent('innkeeper:toast', {
        detail: { type: 'error', message: 'Allow pop-ups to print this bill.' }
      }));
      return;
    }
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const downloadBill = async (bill) => {
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const document = new jsPDF();
      document.setFontSize(16);
      document.text(`Restaurant bill ${bill.orderNumber}`, 14, 17);
      document.setFontSize(10);
      document.text(formatDate(bill.createdAt, timeZone, { dateStyle: 'medium', timeStyle: 'short' }), 14, 24);
      autoTable(document, {
        startY: 31,
        head: [['Item', 'Qty', 'Unit price', 'Amount']],
        body: (bill.items || []).map((item) => [
          item.name,
          item.quantity,
          formatCurrency(item.unitPriceSnapshot ?? item.unitPrice ?? 0),
          formatCurrency(item.amount || 0)
        ])
      });
      autoTable(document, {
        startY: document.lastAutoTable.finalY + 5,
        body: [
          ['Subtotal', formatCurrency(bill.subtotal || 0)],
          ['Discount', formatCurrency(bill.discountAmount || 0)],
          ['Tax', formatCurrency(bill.taxAmount || 0)],
          ['Final amount', formatCurrency(bill.totalAmount || 0)]
        ]
      });
      document.save(`restaurant-bill-${bill.orderNumber}.pdf`);
    } catch (error) {
      showApiErrorToast(error, 'Could not download bill');
    }
  };

  const exportDay = async (day, format) => {
    try {
      const summary = day.summary;
      const billRows = (day.bills || []).map((bill) => ({
        'Bill Number': bill.orderNumber,
        'Date and Time': formatDate(bill.createdAt, timeZone, { dateStyle: 'short', timeStyle: 'short' }),
        'Table Number': bill.tableNumber || bill.tableNameSnapshot || bill.tableId?.tableNumber || '',
        'Dining Type': bill.diningType === 'ac' ? 'AC' : 'Non-AC',
        'Customer Name': bill.guestName || bill.customerName || '',
        Subtotal: bill.subtotal || 0,
        Discount: bill.discountAmount || 0,
        Tax: bill.taxAmount || 0,
        'Final Amount': bill.totalAmount || 0,
        'Payment Method': bill.paymentMethod || '',
        'Payment Status': bill.paymentStatus || 'unpaid',
        'Bill Status': bill.status || ''
      }));
      const summaryRows = [
        { Metric: 'Total sales (incl. tax)', Amount: summary.totalSales },
        { Metric: 'Original price', Amount: summary.originalSales },
        { Metric: 'Discount', Amount: summary.totalDiscount },
        { Metric: 'Tax', Amount: summary.taxAmount },
        { Metric: 'Total bills', Amount: summary.totalBills },
        { Metric: 'AC sales', Amount: summary.acSales },
        { Metric: 'Non-AC sales', Amount: summary.nonAcSales },
        { Metric: 'Food cost (incl. recorded supplier tax)', Amount: summary.foodCostStatus === 'pending' && summary.totalFoodCost === 0 ? 'Awaiting consumption' : summary.totalFoodCost },
        { Metric: 'Wastage', Amount: summary.totalWastage },
        { Metric: 'Paid sales included in gross profit', Amount: summary.paidSales },
        { Metric: 'Paid food cost', Amount: summary.paidFoodCost },
        { Metric: 'Gross profit from paid items', Amount: summary.grossProfit ?? 'Awaiting item cost' }
      ];

      if (format === 'excel') {
        const XLSX = await import('@e965/xlsx');
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Daily Summary');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(billRows), 'Bills');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(day.paymentMethodBreakdown || []), 'Payments');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(day.rawMaterialConsumption || []), 'Food Cost');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(day.wastageDetails || []), 'Wastage');
        XLSX.writeFile(workbook, `restaurant-report-${day.date}.xlsx`);
        return;
      }

      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);
      const document = new jsPDF({ orientation: 'landscape' });
      document.setFontSize(16);
      document.text(`Restaurant daily report · ${day.date}`, 14, 16);
      document.setFontSize(10);
      document.text(`Hotel timezone: ${timeZone}`, 14, 21);
      const addTable = (title, head, body) => {
        let startY = document.lastAutoTable?.finalY
          ? document.lastAutoTable.finalY + 9
          : 27;
        if (startY > 175) {
          document.addPage();
          startY = 18;
        }
        document.setFontSize(11);
        document.text(title, 14, startY);
        autoTable(document, {
          startY: startY + 3,
          head,
          body,
          styles: { fontSize: 8 }
        });
      };
      autoTable(document, {
        startY: 27,
        head: [['Metric', 'Amount']],
        body: summaryRows.map((row) => [
          row.Metric,
          typeof row.Amount === 'number' && row.Metric !== 'Total bills'
            ? formatCurrency(row.Amount)
            : row.Amount
        ])
      });
      addTable('Bills', [['Bill', 'Time', 'Table', 'Dining', 'Customer', 'Subtotal', 'Discount', 'Tax', 'Total', 'Payment', 'Payment status', 'Bill status']],
        billRows.map((bill) => [
          bill['Bill Number'], bill['Date and Time'], bill['Table Number'], bill['Dining Type'],
          bill['Customer Name'], formatCurrency(bill.Subtotal), formatCurrency(bill.Discount),
          formatCurrency(bill.Tax), formatCurrency(bill['Final Amount']),
          bill['Payment Method'], bill['Payment Status'], bill['Bill Status']
        ]));
      addTable('Payment method breakdown', [['Method', 'Amount']],
        (day.paymentMethodBreakdown || []).map((payment) => [payment.method, formatCurrency(payment.amount)]));
      addTable('AC / Non-AC sales', [['Dining type', 'Sales']],
        [['AC', formatCurrency(summary.acSales)], ['Non-AC', formatCurrency(summary.nonAcSales)]]);
      addTable('Raw material consumption', [['Material', 'Quantity', 'Cost', 'Source', 'Department', 'Reason', 'Reference']],
        (day.rawMaterialConsumption || []).map((item) => [
          item.itemName, `${item.quantity} ${item.unit}`, formatCurrency(item.totalCost), item.source,
          item.department || '', item.reason || '', item.reference
        ]));
      addTable('Wastage details', [['Material / item', 'Quantity', 'Cost', 'Department', 'Reason', 'Reference']],
        (day.wastageDetails || []).map((waste) => [
          waste.itemName, `${waste.quantity} ${waste.unit}`, formatCurrency(waste.totalCost), waste.department || '', waste.reason, waste.reference
        ]));
      addTable('Gross profit', [['Metric', 'Amount']], [
        ['Paid sales included', formatCurrency(summary.paidSales)],
        ['Paid food cost', formatCurrency(summary.paidFoodCost)],
        ['Gross profit from paid items', summary.grossProfit === null ? 'Awaiting item cost' : formatCurrency(summary.grossProfit)]
      ]);
      document.save(`restaurant-report-${day.date}.pdf`);
    } catch (error) {
      showApiErrorToast(error, `Could not export ${format === 'excel' ? 'Excel' : 'PDF'} report`);
    }
  };

  const SummaryCard = ({ label, value, tone = 'slate', icon: Icon }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`rounded-xl p-2 ${tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-3 text-xl font-black tracking-tight sm:text-2xl ${tone === 'emerald' ? 'text-emerald-700' : tone === 'rose' ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  );

  const SalesSummaryCard = ({ day }) => {
    const { summary } = day;
    const isExpanded = expandedSalesDate === day.date;
    return (
      <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setExpandedSalesDate(isExpanded ? '' : day.date)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-wide text-emerald-700">Total sales · incl. tax</span>
            <span className="mt-3 block text-xl font-black tracking-tight text-emerald-700 sm:text-2xl">{formatCurrency(summary.totalSales)}</span>
          </span>
          {isExpanded ? <ChevronUp className="h-5 w-5 text-emerald-700" /> : <ChevronDown className="h-5 w-5 text-emerald-700" />}
        </button>
        {isExpanded && (
          <div className="mt-4 space-y-2 border-t border-emerald-100 pt-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-slate-600">Original price</span><b>{formatCurrency(summary.originalSales)}</b></div>
            <div className="flex justify-between gap-3"><span className="text-slate-600">Discount</span><b>−{formatCurrency(summary.totalDiscount)}</b></div>
            <div className="flex justify-between gap-3"><span className="text-slate-600">Tax</span><b>{formatCurrency(summary.taxAmount)}</b></div>
          </div>
        )}
      </section>
    );
  };

  const WastageSummaryCard = ({ day }) => (
    <button
      type="button"
      title="Open inventory wastage records"
      onClick={() => navigate('/inventory?tab=adjustments')}
      className="rounded-2xl border border-rose-200 bg-white p-4 text-left shadow-sm transition hover:border-rose-300 hover:bg-rose-50/40 sm:p-5"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wastage cost</span>
        <ReceiptText className="h-4 w-4 text-rose-700" />
      </span>
      <span className="mt-3 block text-xl font-black tracking-tight text-rose-700 sm:text-2xl">{formatCurrency(day.summary.totalWastage)}</span>
      <span className="mt-1 block text-xs text-slate-500">View wastage records</span>
    </button>
  );

  const SummaryGrid = ({ day }) => {
    if (!day) return null;
    const { summary } = day;
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <SalesSummaryCard day={day} />
        <SummaryCard label="Total bills" value={summary.totalBills} icon={CalendarDays} />
        <SummaryCard label="Food cost · incl. recorded supplier tax" value={summary.foodCostStatus === 'pending' && summary.totalFoodCost === 0 ? 'Awaiting cost' : formatCurrency(summary.totalFoodCost)} icon={TrendingDown} tone={summary.foodCostStatus === 'pending' ? 'rose' : 'slate'} />
        <WastageSummaryCard day={day} />
        <SummaryCard label="Gross profit · paid bills" value={summary.grossProfit === null ? 'Awaiting item cost' : formatCurrency(summary.grossProfit)} icon={TrendingUp} tone={summary.grossProfit === null ? 'slate' : summary.grossProfit >= 0 ? 'emerald' : 'rose'} />
        <SummaryCard label="AC sales" value={formatCurrency(summary.acSales)} icon={CalendarDays} />
        <SummaryCard label="Non-AC sales" value={formatCurrency(summary.nonAcSales)} icon={CalendarDays} />
      </div>
    );
  };

  const BillTable = ({ bills }) => (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1120px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>{['Bill number', 'Date & time', 'Table', 'Dining', 'Customer', 'Subtotal', 'Discount', 'Tax', 'Final amount', 'Payment method', 'Payment status', 'Bill status', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-bold">{heading}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {(bills || []).length === 0 && <tr><td colSpan="13" className="px-4 py-10 text-center text-slate-500">No restaurant bills for this date.</td></tr>}
          {(bills || []).map((bill) => (
            <tr key={bill._id} className="hover:bg-slate-50/80">
              <td className="px-4 py-3 font-bold text-slate-900">{bill.orderNumber}</td>
              <td className="px-4 py-3 text-slate-600">{formatDate(bill.createdAt, timeZone, { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td className="px-4 py-3 text-slate-600">{bill.tableNumber || bill.tableNameSnapshot || bill.tableId?.tableNumber || '—'}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${bill.diningType === 'ac' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-800'}`}>{bill.diningType === 'ac' ? 'AC' : 'Non-AC'}</span></td>
              <td className="px-4 py-3 text-slate-600">{bill.guestName || bill.customerName || '—'}</td>
              <td className="px-4 py-3 text-slate-600">{formatCurrency(bill.subtotal || 0)}</td>
              <td className="px-4 py-3 text-slate-600">{formatCurrency(bill.discountAmount || 0)}</td>
              <td className="px-4 py-3 text-slate-600">{formatCurrency(bill.taxAmount || 0)}</td>
              <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(bill.totalAmount || 0)}</td>
              <td className="px-4 py-3 text-slate-600">{bill.paymentMethod || '—'}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(bill.paymentStatus)}`}>{(bill.paymentStatus || 'unpaid').replaceAll('_', ' ')}</span></td>
              <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(bill.status)}`}>{(bill.status || 'pending').replaceAll('_', ' ')}</span></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setSelectedBill(bill)} title="View bill" aria-label="View bill" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Eye className="h-4 w-4" /></button>
                  <button type="button" onClick={() => printBill(bill)} title="Print bill" aria-label="Print bill" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Printer className="h-4 w-4" /></button>
                  <button type="button" onClick={() => downloadBill(bill)} title="Download bill" aria-label="Download bill" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Download className="h-4 w-4" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const DailyDetails = ({ day, canHideReport = false }) => (
    <div className="space-y-5 border-t border-slate-200 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => exportDay(day, 'pdf')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" /> PDF report</button>
        <button type="button" onClick={() => exportDay(day, 'excel')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><FileSpreadsheet className="h-4 w-4" /> Excel report</button>
        {canHideReport && isHotelAdmin && (
          <button type="button" onClick={() => hideDayReport(day)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50">
            <Trash2 className="h-4 w-4" /> Delete report
          </button>
        )}
      </div>
      <BillTable bills={day.bills} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-3 font-bold text-slate-900">Payment method breakdown</h3>
          {(day.paymentMethodBreakdown || []).length === 0 ? <p className="text-sm text-slate-500">No recorded payments.</p> : day.paymentMethodBreakdown.map((payment) => <div key={payment.method} className="flex justify-between border-t border-slate-100 py-2 text-sm"><span className="capitalize text-slate-600">{payment.method.replaceAll('_', ' ')}</span><b>{formatCurrency(payment.amount)}</b></div>)}
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h4 className="mb-2 text-sm font-bold text-slate-800">AC / Non-AC sales</h4>
            <div className="flex justify-between text-sm"><span>AC</span><b>{formatCurrency(day.summary.acSales)}</b></div>
            <div className="mt-1 flex justify-between text-sm"><span>Non-AC</span><b>{formatCurrency(day.summary.nonAcSales)}</b></div>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-3 font-bold text-slate-900">Gross profit · paid bills only</h3>
          {day.summary.uncostedSalesCount > 0 && (
            <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Gross profit includes paid item lines with recorded costs. Cost data is missing for {day.summary.uncostedSalesCount} paid item line(s).
            </p>
          )}
          <div className="flex justify-between border-t border-slate-100 py-2 text-sm"><span className="text-slate-600">Paid sales included</span><b>{formatCurrency(day.summary.paidSales)}</b></div>
          <div className="flex justify-between border-t border-slate-100 py-2 text-sm"><span className="text-slate-600">Food cost for paid items</span><b>{formatCurrency(day.summary.paidFoodCost)}</b></div>
          <div className="flex justify-between border-t border-slate-100 py-2 text-sm">
            <span className="text-slate-600">Gross profit</span>
            <b className={day.summary.grossProfit < 0 ? 'text-rose-700' : ''}>
              {day.summary.grossProfit === null ? 'Awaiting item cost' : formatCurrency(day.summary.grossProfit)}
            </b>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 p-4">
          <h3 className="mb-3 font-bold text-slate-900">Raw material consumption</h3>
          {(day.rawMaterialConsumption || []).length === 0 ? <p className="text-sm text-slate-500">No consumption recorded.</p> : <div className="max-h-64 space-y-2 overflow-auto">{day.rawMaterialConsumption.map((item, index) => <div key={`${item.reference}-${item.itemName}-${index}`} className="flex justify-between gap-4 border-t border-slate-100 py-2 text-sm"><span>{item.itemName} · {item.quantity} {item.unit}<small className="block text-slate-400">{[item.department, item.reason || item.reference || item.source].filter(Boolean).join(' · ')}</small></span><b className="whitespace-nowrap">{formatCurrency(item.totalCost)}</b></div>)}</div>}
        </section>
        <section>
          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="mb-3 font-bold text-slate-900">Wastage details</h3>
            {(day.wastageDetails || []).length === 0 ? <p className="text-sm text-slate-500">No wastage recorded.</p> : day.wastageDetails.map((waste, index) => <div key={`${waste.reference}-${waste.itemName}-${index}`} className="flex justify-between gap-4 border-t border-slate-100 py-2 text-sm"><span>{waste.itemName} · {waste.quantity} {waste.unit}<small className="block text-slate-400">{waste.department ? `${waste.department} · ` : ''}{waste.reason}</small></span><b className="whitespace-nowrap">{formatCurrency(waste.totalCost)}</b></div>)}
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Restaurant finance</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Billing history & gross profit</h1>
          <p className="mt-2 text-sm text-slate-500">Hotel-local reporting · {timeZone}</p>
        </div>
        <button type="button" onClick={() => loadReport(true)} disabled={refreshing} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 sm:self-auto"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button>
      </header>

      <div className="flex w-full gap-2 rounded-2xl bg-slate-100 p-1 sm:w-fit">
        <button type="button" onClick={() => setTab('today')} className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-bold transition sm:flex-none ${tab === 'today' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Today’s Bills</button>
        <button type="button" onClick={() => setTab('previous')} className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-bold transition sm:flex-none ${tab === 'previous' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Previous Days’ Bills</button>
      </div>

      {loading && !report ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">Loading billing history…</div> : null}
      {report && tab === 'today' && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="text-lg font-black text-slate-900">Today · {report.todayDate}</h2><p className="text-sm text-slate-500">Live bill and financial summary</p></div>
            <div className="text-xs font-medium text-slate-400">Auto-refreshes every 30 seconds</div>
          </div>
          <SummaryGrid day={today} />
          {today?.summary.uncostedSalesCount > 0 && (
            <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Gross profit includes paid item lines with recorded costs. Cost data is missing for {today.summary.uncostedSalesCount} paid item line(s).
            </div>
          )}
          {today && <DailyDetails day={today} />}
        </section>
      )}
      {report && tab === 'previous' && (
        <section className="space-y-4">
          <div><h2 className="text-lg font-black text-slate-900">Previous 5 completed days</h2><p className="text-sm text-slate-500">Each day is reported separately. Today is excluded.</p></div>
          {previousDays.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">No previous days are available.</div>}
          {previousDays.map((day) => {
            const isExpanded = expandedDate === day.date;
            return (
              <article key={day.date} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button type="button" aria-expanded={isExpanded} onClick={() => setExpandedDate(isExpanded ? '' : day.date)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50 sm:p-5">
                  <span className="flex min-w-0 items-center gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><CalendarDays className="h-5 w-5" /></span>                                    <span><b className="block text-base text-slate-900">{formatDate(`${day.date}T12:00:00`, timeZone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</b><small className="text-slate-500">{day.summary.totalBills} bills · Paid-bill gross profit {moneyOrPending(day.summary.grossProfit, day) || formatCurrency(day.summary.grossProfit)}</small></span></span>
                  <span className="flex items-center gap-3"><span className="hidden text-right sm:block"><b className="block text-slate-900">{formatCurrency(day.summary.totalSales)}</b><small className="text-slate-500">Total sales</small></span>{isExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}</span>
                </button>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-3 lg:grid-cols-6">
                  <SalesSummaryCard day={day} />
                  {[
                    ['AC', day.summary.acSales],
                    ['Non-AC', day.summary.nonAcSales],
                    ['Food cost incl. supplier tax', day.summary.totalFoodCost],
                    ['Wastage', day.summary.totalWastage],
                    ['Gross profit · paid', day.summary.grossProfit]
                  ].map(([label, value]) => <div key={label} className="rounded-xl bg-white px-3 py-2"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</small><b className="mt-1 block truncate text-sm text-slate-800">{moneyOrPending(value, day) || formatCurrency(value)}</b></div>)}
                </div>
                {day.summary.uncostedSalesCount > 0 && <p className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">Gross profit includes costed paid lines only; costs are missing for {day.summary.uncostedSalesCount} paid item line(s).</p>}
                {isExpanded && <DailyDetails day={day} canHideReport />}
              </article>
            );
          })}
          {hiddenReports.length > 0 && (
            <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
              <div>
                <h3 className="font-black text-slate-900">Hidden daily reports</h3>
                <p className="text-sm text-slate-600">These reports are hidden from the previous-days list. Their bills and financial records have not been deleted.</p>
              </div>
              {hiddenReports.map((entry) => {
                const request = entry.restoreRequest;
                return (
                  <div key={entry.date} className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-slate-900">
                        {formatDate(`${entry.date}T12:00:00`, timeZone, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {request?.status === 'pending'
                          ? `Restore requested by ${request.requestedBy?.name || 'hotel administrator'} · awaiting product admin approval`
                          : request?.status === 'rejected'
                            ? 'Last restore request was rejected'
                            : request?.status === 'approved'
                              ? 'Hidden again after a previous approval'
                              : 'No restore request submitted'}
                      </p>
                      {request?.reason && <p className="mt-1 text-xs text-slate-600">Reason: {request.reason}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isHotelAdmin && request?.status !== 'pending' && (
                        <button type="button" onClick={() => requestRestore(entry)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                          <RotateCcw className="h-4 w-4" /> Request restore
                        </button>
                      )}
                      {isProductAdmin && request?.status === 'pending' && (
                        <>
                          <button type="button" onClick={() => reviewRestoreRequest({ ...request, reportDate: entry.date }, 'approve')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800">
                            <Check className="h-4 w-4" /> Approve & restore
                          </button>
                          <button type="button" onClick={() => reviewRestoreRequest({ ...request, reportDate: entry.date }, 'reject')} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50">
                            <X className="h-4 w-4" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </section>
      )}

      <Modal isOpen={Boolean(selectedBill)} onClose={() => setSelectedBill(null)} title={`Bill ${selectedBill?.orderNumber || ''}`} subtitle={selectedBill ? formatDate(selectedBill.createdAt, timeZone, { dateStyle: 'full', timeStyle: 'short' }) : ''} maxWidth="max-w-3xl">
        {selectedBill && <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Table', selectedBill.tableNumber || selectedBill.tableNameSnapshot || selectedBill.tableId?.tableNumber || '—'], ['Dining type', selectedBill.diningType === 'ac' ? 'AC' : 'Non-AC'], ['Customer', selectedBill.guestName || selectedBill.customerName || '—'], ['Payment', selectedBill.paymentMethod || selectedBill.paymentStatus || 'unpaid']].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><small className="block text-xs text-slate-500">{label}</small><b className="mt-1 block text-sm capitalize text-slate-800">{value}</b></div>)}
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="py-2">Item</th><th className="py-2">Qty</th><th className="py-2">Price</th><th className="py-2 text-right">Amount</th></tr></thead><tbody>{(selectedBill.items || []).map((item, index) => <tr key={`${item.name}-${index}`} className="border-b border-slate-100"><td className="py-3 font-medium">{item.name}</td><td className="py-3">{item.quantity}</td><td className="py-3">{formatCurrency(item.unitPriceSnapshot ?? item.unitPrice ?? 0)}</td><td className="py-3 text-right font-semibold">{formatCurrency(item.amount || 0)}</td></tr>)}</tbody></table></div>
          <div className="ml-auto max-w-xs space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><b>{formatCurrency(selectedBill.subtotal || 0)}</b></div><div className="flex justify-between"><span>Discount</span><b>−{formatCurrency(selectedBill.discountAmount || 0)}</b></div><div className="flex justify-between"><span>Tax</span><b>{formatCurrency(selectedBill.taxAmount || 0)}</b></div><div className="flex justify-between border-t pt-3 text-base"><b>Final amount</b><b>{formatCurrency(selectedBill.totalAmount || 0)}</b></div></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => printBill(selectedBill)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"><Printer className="h-4 w-4" /> Print</button><button type="button" onClick={() => downloadBill(selectedBill)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"><Download className="h-4 w-4" /> Download PDF</button></div>
        </div>}
      </Modal>
    </main>
  );
};
