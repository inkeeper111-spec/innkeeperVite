import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileCheck2, FilePlus2, PackageCheck, Plus, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import api, { showApiErrorToast } from '../../api/axios';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataSkeleton } from '../../components/ui/DataSkeleton';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useCurrency';

const TABS = [
  ['dashboard', 'Overview', 'procurement_reports'],
  ['requisitions', 'Requisitions', 'procurement_requests'],
  ['orders', 'Purchase orders', 'procurement_orders'],
  ['receipts', 'Goods receipts', 'quality_inspection'],
  ['suppliers', 'Suppliers', 'procurement_suppliers'],
  ['invoices', 'Invoices', 'procurement_invoices'],
  ['payments', 'Payments', 'procurement_payments'],
  ['returns', 'Returns', 'procurement_returns'],
  ['reports', 'Reports', 'procurement_reports']
];

const EMPTY_FORM = {};
const today = () => new Date().toISOString().slice(0, 10);
const idOf = (entry) => String(entry?._id || entry?.id || entry || '');
const safeAttachmentUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
};

export const ProcurementPage = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const admin = ['hotel_admin', 'super_admin'].includes(user?.role);
  const can = (module, action = 'read') => admin || user?.permissions?.[`${module}.${action}`] === true;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [dashboard, setDashboard] = useState(null);
  const [requisitions, setRequisitions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [returns, setReturns] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [report, setReport] = useState([]);
  const [reportType, setReportType] = useState('overview');
  const [reportDates, setReportDates] = useState({ from: '', to: '' });

  const visibleTabs = useMemo(() => TABS.filter(([, , module]) => can(module)), [user]);
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const jobs = [];
    const add = (module, key, path) => {
      if (can(module)) jobs.push(api.get(path).then(({ data }) => [key, data.data]));
    };
    add('procurement_reports', 'dashboard', '/inventory/procurement/dashboard');
    add('procurement_requests', 'requisitions', '/inventory/procurement/requisitions');
    add('procurement_orders', 'orders', '/inventory/procurement/orders');
    add('quality_inspection', 'receipts', '/inventory/procurement/receipts');
    add('procurement_suppliers', 'suppliers', '/inventory/procurement/suppliers');
    add('procurement_invoices', 'invoices', '/inventory/procurement/invoices');
    add('procurement_payments', 'payments', '/inventory/procurement/payments');
    add('procurement_returns', 'returns', '/inventory/procurement/returns');
    if (can('raw_materials')) jobs.push(api.get('/inventory/items', { params: { limit: 500 } }).then(({ data }) => ['items', data.data || []]));
    if (can('storage_locations')) jobs.push(api.get('/inventory/storage-locations').then(({ data }) => ['locations', data.data || []]));
    try {
      const entries = await Promise.all(jobs);
      entries.forEach(([key, value]) => {
        if (key === 'dashboard') setDashboard(value);
        else if (key === 'requisitions') setRequisitions(value || []);
        else if (key === 'orders') setOrders(value || []);
        else if (key === 'receipts') setReceipts(value || []);
        else if (key === 'suppliers') setSuppliers(value || []);
        else if (key === 'invoices') setInvoices(value || []);
        else if (key === 'payments') setPayments(value || []);
        else if (key === 'returns') setReturns(value || []);
        else if (key === 'items') setItems(value || []);
        else if (key === 'locations') setLocations(value || []);
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load procurement data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!visibleTabs.some(([key]) => key === activeTab)) setActiveTab(visibleTabs[0]?.[0] || 'dashboard');
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const run = async (action, successMessage) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      setModal('');
      setForm(EMPTY_FORM);
      setMessage(successMessage);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'The procurement action failed.');
      showApiErrorToast(requestError, 'Procurement action failed');
    } finally {
      setBusy(false);
    }
  };
  const open = (name, initial = {}) => {
    setError('');
    setForm(initial);
    setModal(name);
  };
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const activeLocations = locations.filter((location) => location.isActive !== false);
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === 'active');
  const activeItems = items.filter((item) => item.isActive && item.inventoryType === 'raw_material');
  const editableRequisitions = requisitions.filter((entry) => ['approved', 'partially_approved'].includes(entry.status) && !entry.purchaseOrderId);
  const acceptedReceipts = receipts.filter((entry) => ['completed', 'not_required'].includes(entry.inspectionStatus));
  const openInvoices = invoices.filter((invoice) => ['approved', 'partially_paid', 'overdue'].includes(invoice.status)
    && Number(invoice.outstandingAmount) > 0);

  const createRequisition = (event) => {
    event.preventDefault();
    run(() => api.post('/inventory/procurement/requisitions', {
      department: form.department,
      requiredLocationId: form.requiredLocationId,
      requiredDate: form.requiredDate || null,
      priority: form.priority,
      reason: form.reason,
      remarks: form.remarks,
      lines: [{ itemId: form.itemId, quantity: Number(form.quantity) }]
    }), 'Purchase requisition submitted for review.');
  };
  const reviewRequisition = (event) => {
    event.preventDefault();
    const requisition = requisitions.find((entry) => idOf(entry) === form.requisitionId);
    run(() => api.patch(`/inventory/procurement/requisitions/${form.requisitionId}/review`, {
      decision: form.decision,
      notes: form.notes,
      lines: (requisition?.lines || []).map((line) => ({
        lineId: idOf(line),
        approvedQuantity: Number(form[`approved-${idOf(line)}`] ?? line.quantity)
      }))
    }), form.decision === 'reject' ? 'Requisition rejected.' : 'Requisition review saved.');
  };
  const createSupplier = (event) => {
    event.preventDefault();
    run(() => api.post('/inventory/procurement/suppliers', {
      name: form.name, contactPerson: form.contactPerson, phone: form.phone, email: form.email,
      address: form.address, taxNumber: form.taxNumber, panNumber: form.panNumber,
      state: form.state, stateCode: form.stateCode, supplierCategory: form.supplierCategory,
      paymentTerms: form.paymentTerms || 'Net 30', creditPeriodDays: Number(form.creditPeriodDays || 30),
      openingBalance: Number(form.openingBalance || 0), bankDetails: { upiId: form.upiId }
    }), 'Supplier saved.');
  };
  const createOrder = (event) => {
    event.preventDefault();
    const requisition = requisitions.find((entry) => idOf(entry) === form.requisitionId);
    run(() => api.post(`/inventory/procurement/orders/from-requisition/${form.requisitionId}`, {
      vendorId: form.vendorId,
      expectedDeliveryDate: form.expectedDeliveryDate || null,
      deliveryInstructions: form.deliveryInstructions,
      taxAmount: Number(form.taxAmount || 0),
      discountAmount: Number(form.discountAmount || 0),
      items: (requisition?.lines || []).map((line) => ({
        itemId: idOf(line.itemId),
        unitCost: Number(form[`price-${idOf(line.itemId)}`] || 0)
      }))
    }), 'Purchase order created and submitted for approval.');
  };
  const receiveOrder = (event) => {
    event.preventDefault();
    const order = orders.find((entry) => idOf(entry) === form.orderId);
    run(() => api.patch(`/inventory/purchase-orders/${form.orderId}/receive`, {
      locationId: form.locationId,
      purchaseDate: form.receivedAt || today(),
      supplierChallanNumber: form.supplierChallanNumber,
      vehicleNumber: form.vehicleNumber,
      requireInspection: true,
      notes: form.notes,
      idempotencyKey: globalThis.crypto?.randomUUID?.() || `grn-${Date.now()}`,
      items: (order?.items || []).map((line) => ({
        itemId: idOf(line.itemId),
        receivedQuantity: Number(form[`received-${idOf(line.itemId)}`] || 0)
      }))
    }), 'Receipt logged. Stock will update after quality inspection.');
  };
  const inspectReceipt = (event) => {
    event.preventDefault();
    const receipt = receipts.find((entry) => idOf(entry) === form.receiptId);
    run(() => api.patch(`/inventory/procurement/receipts/${form.receiptId}/inspect`, {
      materialCondition: form.materialCondition,
      freshness: form.freshness,
      packagingCondition: form.packagingCondition,
      temperatureCelsius: form.temperatureCelsius || null,
      remarks: form.remarks,
      lines: (receipt?.lines || []).map((line, index) => ({
        itemId: idOf(line.itemId),
        acceptedQuantity: Number(form[`accepted-${index}`] || 0),
        rejectedQuantity: Number(form[`rejected-${index}`] || 0),
        damagedQuantity: Number(form[`damaged-${index}`] || 0),
        expiryDate: form[`expiry-${index}`] || null
      }))
    }), 'Quality inspection saved. Accepted material was posted to stock.');
  };
  const createInvoice = (event) => {
    event.preventDefault();
    const receipt = acceptedReceipts.find((entry) => idOf(entry) === form.receiptId);
    const orderId = idOf(receipt?.purchaseOrderId);
    const order = orders.find((entry) => idOf(entry) === orderId);
    const lines = (receipt?.lines || []).filter((line) => Number(line.acceptedQuantity) > 0)
      .map((line) => ({
        itemId: idOf(line.itemId),
        goodsReceiptId: idOf(receipt),
        quantity: Number(form[`invoice-qty-${idOf(line.itemId)}`] ?? line.acceptedQuantity),
        unit: line.unit,
        unitPrice: Number(form[`invoice-price-${idOf(line.itemId)}`] ?? line.unitCost),
        gstRate: Number(form[`gst-${idOf(line.itemId)}`] || 0)
      }));
    run(() => api.post('/inventory/procurement/invoices', {
      supplierInvoiceNumber: form.supplierInvoiceNumber,
      invoiceDate: form.invoiceDate,
      dueDate: form.dueDate,
      taxMode: form.taxMode,
      supplierGSTIN: form.supplierGSTIN,
      hotelGSTIN: form.hotelGSTIN,
      placeOfSupply: form.placeOfSupply,
      purchaseOrderId: orderId || idOf(order),
      invoiceType: form.invoiceType,
      attachment: form.attachment,
      lines,
      idempotencyKey: globalThis.crypto?.randomUUID?.() || `invoice-${Date.now()}`
    }), 'Supplier invoice recorded for verification.');
  };
  const createPayment = (event) => {
    event.preventDefault();
    run(() => api.post('/inventory/procurement/payments', {
      vendorId: form.vendorId,
      paymentMethod: form.paymentMethod,
      paidAt: form.paidAt || today(),
      referenceNumber: form.referenceNumber,
      notes: form.notes,
      attachment: form.attachment,
      allocations: (form.allocations || [])
        .filter((allocation) => allocation.invoiceId && Number(allocation.amount) > 0)
        .map((allocation) => ({ invoiceId: allocation.invoiceId, amount: Number(allocation.amount) })),
      idempotencyKey: globalThis.crypto?.randomUUID?.() || `payment-${Date.now()}`
    }), 'Supplier payment allocated to invoice.');
  };
  const createReturn = (event) => {
    event.preventDefault();
    const receipt = acceptedReceipts.find((entry) => idOf(entry) === form.receiptId);
    const line = receipt?.lines?.find((entry) => idOf(entry.itemId) === form.itemId);
    run(() => api.post('/inventory/procurement/returns', {
      goodsReceiptId: form.receiptId,
      invoiceId: form.invoiceId || undefined,
      reason: form.reason,
      notes: form.notes,
      lines: [{ itemId: form.itemId, quantity: Number(form.quantity), itemName: line?.itemId?.name || '' }],
      idempotencyKey: globalThis.crypto?.randomUUID?.() || `return-${Date.now()}`
    }), 'Supplier return request created.');
  };
  const loadReport = async () => {
    setBusy(true);
    try {
      const { data } = await api.get('/inventory/procurement/reports', {
        params: { type: reportType, ...reportDates }
      });
      setReport(data.data?.rows || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load procurement report.');
    } finally {
      setBusy(false);
    }
  };
  const exportRows = async (format) => {
    if (!report.length) return;
    const rows = report.map((entry) => Object.fromEntries(
      Object.entries(entry).map(([key, value]) => [
        key,
        value && typeof value === 'object' ? JSON.stringify(value) : value
      ])
    ));
    if (format === 'excel') {
      const XLSX = await import('@e965/xlsx');
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Procurement');
      XLSX.writeFile(workbook, `procurement-${reportType}-${today()}.xlsx`);
      return;
    }
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const document = new jsPDF({ orientation: 'landscape' });
    autoTable(document, {
      head: [Object.keys(rows[0])],
      body: rows.map((row) => Object.values(row).map((value) => String(value ?? '')))
    });
    document.save(`procurement-${reportType}-${today()}.pdf`);
  };

  if (loading) return <DataSkeleton variant="page" rows={6} columns={4} label="Loading procurement workspace" />;

  const value = (amount) => formatCurrency(Number(amount || 0));
  const stateTag = (status) => <Badge variant={status}>{String(status || '').replace(/_/g, ' ')}</Badge>;
  const openForm = (title, onSubmit, body) => (
    <Modal isOpen={Boolean(modal)} onClose={() => setModal('')} title={title}>
      <form className="space-y-4" onSubmit={onSubmit}>
        {body}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={() => setModal('')}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
  const select = (label, field, options, required = true) => (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select required={required} value={form[field] || ''} onChange={(event) => {
        if (field === 'vendorId' && modal === 'payment') {
          setForm((current) => ({
            ...current,
            vendorId: event.target.value,
            allocations: (current.allocations || []).map(() => ({ invoiceId: '', amount: '' }))
          }));
        } else {
          setField(field, event.target.value);
        }
      }}
        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100">
        <option value="">Select…</option>
        {options.map((entry) => <option key={idOf(entry)} value={idOf(entry)}>{entry.label || entry.name}</option>)}
      </select>
    </label>
  );
  const text = (label, field, type = 'text', required = false) => (
    <Input label={label} type={type} required={required} value={form[field] || ''} onChange={(event) => setField(field, event.target.value)} />
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-[#eadfce] bg-gradient-to-br from-white via-[#fffdf8] to-[#f8f0e2] p-5 shadow-sm sm:flex-row sm:items-center sm:p-7">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-amber-700"><PackageCheck size={16} /> Purchasing &amp; procurement</div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Procurement workspace</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">Trace requests from requisition through receipt, quality inspection, invoices, returns and supplier settlement.</p>
        </div>
        <Button variant="outline" icon={RefreshCw} onClick={loadData}>Refresh</Button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}

      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Procurement sections">
        {visibleTabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === key ? 'bg-slate-900 text-white shadow' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Pending requisitions', dashboard?.pendingRequisitions ?? '—'],
              ['Purchase orders awaiting approval', dashboard?.pendingOrders ?? '—'],
              ['Goods receipts awaiting inspection', dashboard?.pendingReceipts ?? '—'],
              ['Invoices awaiting verification', dashboard?.pendingInvoices ?? '—'],
              ['Supplier outstanding', value(dashboard?.supplierOutstanding)],
              ['Overdue supplier invoices', value(dashboard?.overdueAmount)],
              ['Accepted quantity this month', dashboard?.receivedQuantityThisMonth ?? 0],
              ['Supplier returns', dashboard?.totalReturns ?? 0]
            ].map(([label, amount]) => (
              <Card key={label} className="border border-[#eee5d8] bg-white">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black tabular-nums text-slate-900">{amount}</p>
              </Card>
            ))}
          </div>
          <Card title="Lifecycle controls" subtitle="Inventory only changes after the GRN passes inspection. Invoices and payments update supplier balances separately.">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4"><FilePlus2 className="h-5 w-5 text-amber-700" /><p className="mt-2 font-bold">Requisition to order</p><p className="mt-1 text-xs leading-5 text-slate-500">Requests do not change stock. Approved quantities can be priced and sent as a purchase order.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><ShieldCheck className="h-5 w-5 text-emerald-700" /><p className="mt-2 font-bold">Inspect before stocking</p><p className="mt-1 text-xs leading-5 text-slate-500">Record physical receipt first. Only the inspected accepted quantity is posted to a stock batch.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><FileCheck2 className="h-5 w-5 text-blue-700" /><p className="mt-2 font-bold">Invoice and settlement</p><p className="mt-1 text-xs leading-5 text-slate-500">Supplier invoices are matched to accepted GRN lines, verified, approved and paid with allocations.</p></div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'requisitions' && (
        <Card title="Purchase requisitions" subtitle="Requested material, required location, current availability and review status."
          action={can('procurement_requests', 'create') && <Button icon={Plus} onClick={() => open('requisition', { priority: 'normal', requiredDate: today() })}>New requisition</Button>}>
          <div className="space-y-3">
            {requisitions.map((entry) => (
              <article key={idOf(entry)} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-bold">{entry.requisitionNumber} <span className="ml-2">{stateTag(entry.status)}</span></p><p className="mt-1 text-xs text-slate-500">{entry.department} · {entry.requiredLocation} · {entry.requestedBy?.name || 'Staff'} · {new Date(entry.createdAt).toLocaleDateString()}</p></div>
                  {can('procurement_requests', 'update') && entry.status === 'pending' && <Button size="sm" onClick={() => open('reviewRequisition', { requisitionId: idOf(entry), decision: 'approve', ...entry.lines.reduce((values, line) => ({ ...values, [`approved-${idOf(line)}`]: line.quantity }), {}) })}>Review</Button>}
                  {can('procurement_orders', 'create') && ['approved', 'partially_approved'].includes(entry.status) && !entry.purchaseOrderId && <Button size="sm" icon={Truck} onClick={() => open('order', { requisitionId: idOf(entry), expectedDeliveryDate: today() })}>Create PO</Button>}
                </div>
                <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-slate-500"><tr><th className="py-2">Material</th><th>Requested</th><th>Available at location</th><th>Approved</th></tr></thead><tbody>{entry.lines.map((line) => <tr key={idOf(line)} className="border-t"><td className="py-2 font-semibold">{line.itemName}</td><td>{line.quantity} {line.unit}</td><td>{line.availableQuantity} {line.unit}</td><td>{line.approvedQuantity ?? 'Pending'}</td></tr>)}</tbody></table></div>
              </article>
            ))}
            {!requisitions.length && <p className="py-8 text-center text-sm text-slate-500">No requisitions yet.</p>}
          </div>
        </Card>
      )}

      {activeTab === 'orders' && (
        <Card title="Purchase orders" subtitle="Review submissions, receive deliveries and follow order quantities."
          action={can('procurement_orders', 'create') && <Button icon={Plus} onClick={() => setActiveTab('requisitions')}>Select approved requisition</Button>}>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-3">PO / Supplier</th><th>Status</th><th>Amount</th><th>Delivery</th><th>Actions</th></tr></thead><tbody>{orders.map((order) => <tr key={idOf(order)} className="border-t"><td className="py-3"><p className="font-bold">{order.poNumber}</p><p className="text-xs text-slate-500">{order.vendorId?.name || 'Supplier'}</p></td><td>{stateTag(order.status)}</td><td className="font-semibold">{value(order.totalAmount)}</td><td>{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '—'}</td><td className="space-x-2">{can('procurement_orders', 'update') && ['pending_approval', 'draft'].includes(order.status) && <><Button size="sm" onClick={() => run(() => api.patch(`/inventory/procurement/orders/${idOf(order)}/review`, { action: 'approve' }), 'Purchase order approved.')}>Approve</Button><Button size="sm" variant="outline" onClick={() => run(() => api.patch(`/inventory/procurement/orders/${idOf(order)}/review`, { action: 'reject', reason: window.prompt('Reason for rejection') || '' }), 'Purchase order rejected.')}>Reject</Button></>}{can('raw_materials', 'update') && ['ordered', 'partially_received', 'approved'].includes(order.status) && <Button size="sm" variant="outline" onClick={() => open('receipt', { orderId: idOf(order), locationId: order.deliveryLocationId || '' })}>Receive</Button>}{can('procurement_orders', 'update') && ['ordered', 'pending_approval'].includes(order.status) && <Button size="sm" variant="outline" onClick={() => run(() => api.patch(`/inventory/procurement/orders/${idOf(order)}/cancel`, { reason: window.prompt('Reason for cancellation') || '' }), 'Purchase order cancelled.')}>Cancel</Button>}</td></tr>)}</tbody></table>{!orders.length && <p className="py-8 text-center text-sm text-slate-500">No purchase orders recorded.</p>}</div>
        </Card>
      )}

      {activeTab === 'receipts' && (
        <Card title="Goods received & quality inspection" subtitle="Receipts created through the procurement workspace remain out of stock until an inspection is complete."
          action={can('quality_inspection', 'create') && orders.some((order) => ['ordered', 'partially_received'].includes(order.status)) && <Button icon={Plus} onClick={() => open('receipt', { orderId: '', locationId: activeLocations[0] ? idOf(activeLocations[0]) : '' })}>Record delivery</Button>}>
          <div className="space-y-3">{receipts.map((receipt) => (
            <article key={idOf(receipt)} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
              <div><p className="font-bold">{receipt.receiptNumber} {stateTag(receipt.inspectionStatus)}</p><p className="mt-1 text-xs text-slate-500">{receipt.purchaseOrderId?.poNumber} · {receipt.location} · {new Date(receipt.receivedAt).toLocaleDateString()}</p><p className="mt-2 text-xs">{receipt.lines?.map((line) => `${line.itemId?.name || 'Material'}: ${line.receivedQuantity} received, ${line.acceptedQuantity} accepted`).join(' · ')}</p></div>
              {can('quality_inspection', 'update') && receipt.inspectionStatus === 'pending' && <Button size="sm" icon={ShieldCheck} onClick={() => open('inspect', { receiptId: idOf(receipt), ...(receipt.lines || []).reduce((values, line, index) => ({ ...values, [`accepted-${index}`]: line.receivedQuantity, [`rejected-${index}`]: 0, [`damaged-${index}`]: 0 }), {}) })}>Inspect receipt</Button>}
            </article>
          ))}{!receipts.length && <p className="py-8 text-center text-sm text-slate-500">No goods receipts yet.</p>}</div>
        </Card>
      )}

      {activeTab === 'suppliers' && (
        <Card title="Supplier master" subtitle="One supplier profile per hotel. Supplier history, GSTIN and opening balance are retained."
          action={can('procurement_suppliers', 'create') && <Button icon={Plus} onClick={() => open('supplier', { creditPeriodDays: 30, paymentTerms: 'Net 30' })}>Add supplier</Button>}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{suppliers.map((supplier) => <article key={idOf(supplier)} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-2"><h3 className="font-bold">{supplier.name}</h3>{stateTag(supplier.status)}</div><p className="text-xs text-slate-500">{supplier.supplierCode || 'Supplier'} · {supplier.phone}</p><div className="mt-3 space-y-1 text-xs text-slate-600"><p>GSTIN: {supplier.taxNumber || '—'} · PAN: {supplier.panNumber || '—'}</p><p>Payment terms: {supplier.paymentTerms} · {supplier.creditPeriodDays ?? 30} days</p><p className="font-bold text-slate-800">Outstanding: {value(supplier.outstandingBalance)}</p></div>{can('procurement_suppliers', 'update') && <Button className="mt-3" size="sm" variant="outline" onClick={() => open('supplier', { ...supplier, vendorId: idOf(supplier), upiId: supplier.bankDetails?.upiId })}>Edit supplier</Button>}</article>)}{!suppliers.length && <p className="py-8 text-sm text-slate-500">No suppliers registered.</p>}</div>
        </Card>
      )}

      {activeTab === 'invoices' && (
        <Card title="Supplier invoices" subtitle="Invoice quantities are matched to accepted GRN quantities; stock is never changed by invoice entry."
          action={can('procurement_invoices', 'create') && acceptedReceipts.length > 0 && <Button icon={Plus} onClick={() => open('invoice', { invoiceDate: today(), dueDate: today(), taxMode: 'intra_state', invoiceType: 'tax_invoice', receiptId: idOf(acceptedReceipts[0]) })}>Record invoice</Button>}>
          <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-3">Supplier invoice</th><th>PO / GRN</th><th>Status</th><th>Tax split</th><th>Total</th><th>Outstanding</th><th>Actions</th></tr></thead><tbody>{invoices.map((invoice) => { const attachmentUrl = safeAttachmentUrl(invoice.attachment); return <tr key={idOf(invoice)} className="border-t"><td className="py-3"><p className="font-bold">{invoice.supplierInvoiceNumber}</p><p className="text-xs text-slate-500">{invoice.vendorId?.name}</p>{attachmentUrl && <a className="text-xs text-blue-700 underline" href={attachmentUrl} target="_blank" rel="noreferrer">View attachment</a>}</td><td>{invoice.purchaseOrderId?.poNumber}<p className="text-xs text-slate-500">{invoice.goodsReceiptIds?.map((entry) => entry.receiptNumber).join(', ')}</p></td><td>{stateTag(invoice.status)}{(invoice.quantityVariance || invoice.priceVariance) && <p className="text-[10px] font-bold text-amber-700">Variance flagged</p>}</td><td className="text-xs">CGST {value(invoice.cgstTotal)}<br />SGST {value(invoice.sgstTotal)}<br />IGST {value(invoice.igstTotal)}</td><td>{value(invoice.grandTotal)}</td><td>{value(invoice.outstandingAmount)}</td><td className="space-x-1">{can('procurement_invoices', 'update') && ['pending_verification', 'disputed'].includes(invoice.status) && <Button size="sm" variant="outline" onClick={() => run(() => api.patch(`/inventory/procurement/invoices/${idOf(invoice)}/verify`, { authorizeVariance: admin, notes: 'Reviewed against the goods receipt.' }), 'Invoice verification updated.')}>Verify</Button>}{can('procurement_invoices', 'update') && invoice.status === 'verified' && <Button size="sm" onClick={() => run(() => api.patch(`/inventory/procurement/invoices/${idOf(invoice)}/approve`), 'Invoice approved; supplier balance updated.')}>Approve</Button>}</td></tr>; })}</tbody></table>{!invoices.length && <p className="py-8 text-center text-sm text-slate-500">No supplier invoices recorded.</p>}</div>
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card title="Supplier payments" subtitle="Payments allocate to approved invoices and update invoice balances transactionally."
          action={can('procurement_payments', 'create') && openInvoices.length > 0 && <Button icon={Plus} onClick={() => open('payment', { paidAt: today(), allocations: [{ invoiceId: '', amount: '' }] })}>Record payment</Button>}>
          <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-3">Date / supplier</th><th>Reference</th><th>Amount</th><th>Invoices</th><th>Method</th><th>Document</th></tr></thead><tbody>{payments.map((payment) => { const attachmentUrl = safeAttachmentUrl(payment.attachment); return <tr key={idOf(payment)} className="border-t"><td className="py-3">{new Date(payment.paidAt).toLocaleDateString()}<p className="text-xs text-slate-500">{payment.vendorId?.name}</p></td><td>{payment.referenceNumber || '—'}</td><td className="font-semibold">{value(payment.amount)}</td><td>{payment.allocations?.map((allocation) => allocation.invoiceId?.supplierInvoiceNumber).filter(Boolean).join(', ') || payment.invoiceNumber || 'Advance / legacy'}</td><td className="capitalize">{String(payment.paymentMethod || '').replace(/_/g, ' ')}</td><td>{attachmentUrl && <a className="text-xs text-blue-700 underline" href={attachmentUrl} target="_blank" rel="noreferrer">View document</a>}</td></tr>; })}</tbody></table>{!payments.length && <p className="py-8 text-center text-sm text-slate-500">No payments recorded.</p>}</div>
        </Card>
      )}

      {activeTab === 'returns' && (
        <Card title="Supplier returns" subtitle="Approved returns deduct stock once. A supplier credit note adjusts invoice payable without a second stock movement."
          action={can('procurement_returns', 'create') && acceptedReceipts.length > 0 && <Button icon={Plus} onClick={() => open('return', { receiptId: idOf(acceptedReceipts[0]) })}>Request return</Button>}>
          <div className="space-y-3">{returns.map((entry) => <article key={idOf(entry)} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div><p className="font-bold">{entry.returnNumber} {stateTag(entry.status)}</p><p className="mt-1 text-xs text-slate-500">{entry.vendorId?.name} · {entry.goodsReceiptId?.receiptNumber} · {entry.reason}</p><p className="mt-1 text-sm font-semibold">{value(entry.totalValue)}</p></div><div className="flex gap-2">{can('procurement_returns', 'update') && entry.status === 'requested' && <Button size="sm" onClick={() => run(() => api.patch(`/inventory/procurement/returns/${idOf(entry)}/approve`), 'Return approved.')}>Approve</Button>}{can('procurement_returns', 'update') && entry.status === 'approved' && <Button size="sm" variant="outline" onClick={() => run(() => api.patch(`/inventory/procurement/returns/${idOf(entry)}/complete`, { creditNoteNumber: window.prompt('Credit note number, if available') || '' }), 'Return completed and stock deducted once.')}>Complete return</Button>}</div></article>)}{!returns.length && <p className="py-8 text-center text-sm text-slate-500">No supplier return requests.</p>}</div>
        </Card>
      )}

      {activeTab === 'reports' && (
        <Card title="Procurement reports" subtitle="Export PO, receipt, invoice, return, payment and unified procurement activity by date.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600">Report type<select value={reportType} onChange={(event) => setReportType(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"><option value="overview">All activity</option><option value="orders">Purchase orders</option><option value="receipts">Goods receipts</option><option value="invoices">Supplier invoices</option><option value="returns">Supplier returns</option><option value="payments">Supplier payments</option></select></label>
            <Input label="From date" type="date" value={reportDates.from} onChange={(event) => setReportDates((dates) => ({ ...dates, from: event.target.value }))} />
            <Input label="To date" type="date" value={reportDates.to} onChange={(event) => setReportDates((dates) => ({ ...dates, to: event.target.value }))} />
            <div className="flex items-end gap-2"><Button disabled={busy} onClick={loadReport}>Run report</Button><Button disabled={!report.length} variant="outline" icon={Download} onClick={() => exportRows('excel')}>Excel</Button><Button disabled={!report.length} variant="outline" onClick={() => exportRows('pdf')}>PDF</Button></div>
          </div>
          {report.length > 0 && <div className="mt-4 max-h-[34rem] overflow-auto rounded-lg border"><table className="w-full min-w-max text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-500"><tr>{Object.keys(report[0]).map((key) => <th key={key} className="px-3 py-2">{key.replace(/([A-Z])/g, ' $1')}</th>)}</tr></thead><tbody>{report.map((row, index) => <tr key={row._id || row.documentNumber || index} className="border-t border-slate-100">{Object.keys(report[0]).map((key) => <td key={key} className="max-w-64 px-3 py-2 align-top">{row[key] && typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? '—')}</td>)}</tr>)}</tbody></table></div>}
          {!report.length && <p className="mt-5 text-center text-sm text-slate-500">Select filters and run a report.</p>}
        </Card>
      )}

      {modal === 'requisition' && openForm('Create purchase requisition', createRequisition, <>
        <div className="grid gap-3 sm:grid-cols-2">{text('Department', 'department', 'text', true)}{select('Required storage location', 'requiredLocationId', activeLocations.map((entry) => ({ ...entry, label: entry.locationName })))}{select('Raw material', 'itemId', activeItems.map((entry) => ({ ...entry, label: `${entry.name} (${entry.baseUnit || entry.unit})` })))}{text('Quantity', 'quantity', 'number', true)}{text('Required date', 'requiredDate', 'date')}{select('Priority', 'priority', [{ _id: 'normal', label: 'Normal' }, { _id: 'urgent', label: 'Urgent' }])}</div>{text('Reason', 'reason')}{text('Remarks', 'remarks')}
      </>)}
      {modal === 'reviewRequisition' && openForm('Review purchase requisition', reviewRequisition, <>
        {select('Decision', 'decision', [{ _id: 'approve', label: 'Approve quantities' }, { _id: 'reject', label: 'Reject requisition' }])}
        {(requisitions.find((entry) => idOf(entry) === form.requisitionId)?.lines || []).map((line) => <Input key={idOf(line)} label={`${line.itemName} — requested ${line.quantity} ${line.unit}`} type="number" min="0" max={line.quantity} step="0.001" required value={form[`approved-${idOf(line)}`] ?? line.quantity} onChange={(event) => setField(`approved-${idOf(line)}`, event.target.value)} />)}
        {text('Review notes', 'notes')}
      </>)}
      {modal === 'supplier' && openForm(form.vendorId ? 'Edit supplier' : 'Add supplier', (event) => {
        event.preventDefault();
        const action = form.vendorId
          ? api.patch(`/inventory/procurement/suppliers/${form.vendorId}`, { ...form, bankDetails: { upiId: form.upiId } })
          : createSupplier(event);
        if (form.vendorId) run(() => action, 'Supplier updated.');
      }, <>
        <div className="grid gap-3 sm:grid-cols-2">{text('Supplier name', 'name', 'text', true)}{text('Contact person', 'contactPerson')}{text('Mobile number', 'phone', 'tel', true)}{text('Email', 'email', 'email')}{text('GSTIN', 'taxNumber')}{text('PAN', 'panNumber')}{text('State', 'state')}{text('State code', 'stateCode')}{text('Category', 'supplierCategory')}{text('Payment terms', 'paymentTerms')}{text('Credit period (days)', 'creditPeriodDays', 'number')}{text('Opening balance', 'openingBalance', 'number')}{text('UPI ID', 'upiId')}{text('Address', 'address')}</div>
      </>)}
      {modal === 'order' && openForm('Create purchase order', createOrder, <>
        <div className="grid gap-3 sm:grid-cols-2">{select('Supplier', 'vendorId', activeSuppliers)}{text('Expected delivery', 'expectedDeliveryDate', 'date')}</div>
        {(requisitions.find((entry) => idOf(entry) === form.requisitionId)?.lines || []).map((line) => <Input key={idOf(line)} label={`${line.itemName} — unit price (${line.unit})`} type="number" step="0.01" required value={form[`price-${idOf(line.itemId)}`] || ''} onChange={(event) => setField(`price-${idOf(line.itemId)}`, event.target.value)} />)}
        <div className="grid gap-3 sm:grid-cols-2">{text('Tax amount', 'taxAmount', 'number')}{text('Discount', 'discountAmount', 'number')}</div>{text('Delivery instructions', 'deliveryInstructions')}
      </>)}
      {modal === 'receipt' && openForm('Record physical delivery', receiveOrder, <>
        {select('Purchase order', 'orderId', orders.filter((entry) => ['ordered', 'partially_received', 'approved'].includes(entry.status)).map((entry) => ({ ...entry, label: `${entry.poNumber} · ${entry.vendorId?.name || 'Supplier'}` })))}
        {form.orderId && (orders.find((entry) => idOf(entry) === form.orderId)?.items || []).map((line) => <Input key={idOf(line.itemId)} label={`${line.itemName} received (${line.unit}) — remaining ${Math.max(0, Number(line.quantity) - Number(line.receivedQuantity || 0))}`} type="number" min="0" step="0.001" value={form[`received-${idOf(line.itemId)}`] || ''} onChange={(event) => setField(`received-${idOf(line.itemId)}`, event.target.value)} />)}
        <div className="grid gap-3 sm:grid-cols-2">{select('Receiving location', 'locationId', activeLocations.map((entry) => ({ ...entry, label: entry.locationName })))}{text('Received date', 'receivedAt', 'date')}{text('Delivery challan number', 'supplierChallanNumber')}{text('Vehicle number', 'vehicleNumber')}</div>{text('Notes', 'notes')}
      </>)}
      {modal === 'inspect' && openForm('Inspect goods receipt', inspectReceipt, <>
        {(receipts.find((entry) => idOf(entry) === form.receiptId)?.lines || []).map((line, index) => <div key={`${idOf(line.itemId)}-${index}`} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-4"><p className="sm:col-span-4 text-sm font-semibold">{line.itemId?.name || 'Material'} · received {line.receivedQuantity} {line.unit}</p><Input label="Accepted" type="number" min="0" step="0.001" required value={form[`accepted-${index}`] ?? ''} onChange={(event) => setField(`accepted-${index}`, event.target.value)} /><Input label="Rejected" type="number" min="0" step="0.001" value={form[`rejected-${index}`] ?? ''} onChange={(event) => setField(`rejected-${index}`, event.target.value)} /><Input label="Damaged" type="number" min="0" step="0.001" value={form[`damaged-${index}`] ?? ''} onChange={(event) => setField(`damaged-${index}`, event.target.value)} /><Input label="Expiry date" type="date" value={form[`expiry-${index}`] || ''} onChange={(event) => setField(`expiry-${index}`, event.target.value)} /></div>)}
        <div className="grid gap-3 sm:grid-cols-2">{text('Material condition', 'materialCondition')}{text('Freshness', 'freshness')}{text('Packaging condition', 'packagingCondition')}{text('Temperature °C', 'temperatureCelsius', 'number')}{text('Inspection notes', 'remarks')}</div>
      </>)}
      {modal === 'invoice' && openForm('Record supplier invoice', createInvoice, <>
        {select('Goods receipt', 'receiptId', acceptedReceipts.map((entry) => ({ ...entry, label: `${entry.receiptNumber} · ${entry.purchaseOrderId?.poNumber}` })))}
        <div className="grid gap-3 sm:grid-cols-2">{text('Supplier invoice number', 'supplierInvoiceNumber', 'text', true)}{select('Invoice type', 'invoiceType', [{ _id: 'tax_invoice', label: 'Tax invoice' }, { _id: 'bill_of_supply', label: 'Bill of supply' }, { _id: 'credit_note', label: 'Credit note' }, { _id: 'debit_note', label: 'Debit note' }])}{text('Invoice date', 'invoiceDate', 'date', true)}{text('Due date', 'dueDate', 'date', true)}</div>
        <div className="grid gap-3 sm:grid-cols-2">{select('Tax mode', 'taxMode', [{ _id: 'intra_state', label: 'Intra-state (CGST + SGST)' }, { _id: 'inter_state', label: 'Inter-state (IGST)' }, { _id: 'legacy', label: 'Unspecified / legacy tax' }])}{text('Supplier GSTIN', 'supplierGSTIN')}{text('Hotel GSTIN', 'hotelGSTIN')}{text('Place of supply', 'placeOfSupply')}</div>
        {(acceptedReceipts.find((entry) => idOf(entry) === form.receiptId)?.lines || []).filter((line) => line.acceptedQuantity > 0).map((line) => <div key={idOf(line.itemId)} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3"><p className="sm:col-span-3 text-sm font-semibold">{line.itemId?.name || 'Material'} — accepted {line.acceptedQuantity} {line.unit}</p><Input label="Invoice quantity" type="number" min="0.001" step="0.001" value={form[`invoice-qty-${idOf(line.itemId)}`] ?? line.acceptedQuantity} onChange={(event) => setField(`invoice-qty-${idOf(line.itemId)}`, event.target.value)} /><Input label="Unit price" type="number" min="0" step="0.01" value={form[`invoice-price-${idOf(line.itemId)}`] ?? line.unitCost} onChange={(event) => setField(`invoice-price-${idOf(line.itemId)}`, event.target.value)} /><Input label="GST %" type="number" min="0" max="100" step="0.01" value={form[`gst-${idOf(line.itemId)}`] || '0'} onChange={(event) => setField(`gst-${idOf(line.itemId)}`, event.target.value)} /></div>)}
        {text('Invoice attachment URL', 'attachment')}
      </>)}
      {modal === 'payment' && openForm('Record supplier payment', createPayment, <>
        {select('Supplier', 'vendorId', suppliers.map((entry) => ({ ...entry, label: entry.name })))}
        <div className="space-y-3">
          {(form.allocations || []).map((allocation, index) => {
            const otherInvoiceIds = new Set((form.allocations || [])
              .filter((_, otherIndex) => otherIndex !== index)
              .map((entry) => entry.invoiceId));
            const availableInvoices = openInvoices.filter((entry) => (
              (!form.vendorId || idOf(entry.vendorId) === form.vendorId)
              && (!otherInvoiceIds.has(idOf(entry)) || allocation.invoiceId === idOf(entry))
            ));
            return <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
              <label className="block text-sm font-medium text-slate-700">Invoice
                <select required value={allocation.invoiceId} onChange={(event) => {
                  const invoiceId = event.target.value;
                  const invoice = openInvoices.find((entry) => idOf(entry) === invoiceId);
                  setForm((current) => ({
                    ...current,
                    vendorId: current.vendorId || idOf(invoice?.vendorId),
                    allocations: current.allocations.map((entry, allocationIndex) => (
                      allocationIndex === index
                        ? { ...entry, invoiceId, amount: invoice ? String(invoice.outstandingAmount) : '' }
                        : entry
                    ))
                  }));
                }} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100">
                  <option value="">Select invoice…</option>
                  {availableInvoices.map((invoice) => <option key={idOf(invoice)} value={idOf(invoice)}>{invoice.supplierInvoiceNumber} · outstanding {value(invoice.outstandingAmount)}</option>)}
                </select>
              </label>
              <Input label="Allocated amount" type="number" min="0.01" max={openInvoices.find((entry) => idOf(entry) === allocation.invoiceId)?.outstandingAmount} step="0.01" required value={allocation.amount}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  allocations: current.allocations.map((entry, allocationIndex) => (
                    allocationIndex === index ? { ...entry, amount: event.target.value } : entry
                  ))
                }))} />
              {form.allocations.length > 1 && <Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({
                ...current,
                allocations: current.allocations.filter((_, allocationIndex) => allocationIndex !== index)
              }))}>Remove</Button>}
            </div>;
          })}
          {form.allocations.length < openInvoices.filter((entry) => !form.vendorId || idOf(entry.vendorId) === form.vendorId).length
            && <Button type="button" size="sm" variant="outline" icon={Plus} onClick={() => setForm((current) => ({
              ...current,
              allocations: [...current.allocations, { invoiceId: '', amount: '' }]
            }))}>Add invoice allocation</Button>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">{select('Payment mode', 'paymentMethod', ['bank_transfer', 'upi', 'cash', 'card', 'cheque', 'other'].map((entry) => ({ _id: entry, label: entry.replace(/_/g, ' ') })))}{text('Payment date', 'paidAt', 'date')}{text('Transaction reference', 'referenceNumber')}{text('Payment attachment URL', 'attachment')}</div>{text('Remarks', 'notes')}
      </>)}
      {modal === 'return' && openForm('Request supplier return', createReturn, <>
        {select('Goods receipt', 'receiptId', acceptedReceipts.map((entry) => ({ ...entry, label: `${entry.receiptNumber} · ${entry.purchaseOrderId?.poNumber}` })))}
        {select('Material', 'itemId', (acceptedReceipts.find((entry) => idOf(entry) === form.receiptId)?.lines || []).filter((line) => line.acceptedQuantity > 0).map((line) => ({ _id: idOf(line.itemId), label: `${line.itemId?.name || 'Material'} · ${line.acceptedQuantity} ${line.unit}` })))}
        {text('Return quantity', 'quantity', 'number', true)}{text('Reason', 'reason', 'text', true)}{select('Supplier invoice for credit adjustment (optional)', 'invoiceId', invoices.filter((entry) => idOf(entry.purchaseOrderId) === idOf(acceptedReceipts.find((receipt) => idOf(receipt) === form.receiptId)?.purchaseOrderId)).map((entry) => ({ ...entry, label: entry.supplierInvoiceNumber })), false)}{text('Notes', 'notes')}
      </>)}
    </div>
  );
};

export default ProcurementPage;
