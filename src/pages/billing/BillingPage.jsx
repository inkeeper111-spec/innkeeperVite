import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useCurrency } from '../../hooks/useCurrency';
import {
  Receipt,
  CreditCard,
  Printer,
  Search,
  DollarSign,
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import dayjs from 'dayjs';

export const BillingPage = () => {
  const { currencySymbol, formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' or 'payments'
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundFormData, setRefundFormData] = useState({ amount: '', reason: '' });
  const [refundError, setRefundError] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  // Payment Form
  const [payFormData, setPayFormData] = useState({
    invoiceId: '',
    amount: '',
    method: 'cash',
    transactionRef: '',
    notes: ''
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [invRes, payRes] = await Promise.all([
        api.get('/billing/invoices'),
        api.get('/billing/payments')
      ]);
      if (invRes.data.success) setInvoices(invRes.data.data.invoices);
      if (payRes.data.success) setPayments(payRes.data.data.payments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleOpenInvoice = async (invoiceId) => {
    try {
      const res = await api.get(`/billing/invoices/${invoiceId}`);
      if (res.data.success) {
        setSelectedInvoice(res.data.data.invoice);
        setIsInvoiceModalOpen(true);
      }
    } catch (e) {
      alert('Failed to load invoice details.');
    }
  };

  const handleOpenPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPayFormData({
      invoiceId: invoice._id,
      amount: invoice.balanceAmount,
      method: 'cash',
      transactionRef: '',
      notes: ''
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setError('');
    setProcessingPayment(true);
    try {
      const res = await api.post('/billing/invoices/record-payment', {
        ...payFormData,
        amount: Number(payFormData.amount)
      });
      if (res.data.success) {
        setIsPaymentModalOpen(false);
        setMessage(`Payment of ${formatCurrency(payFormData.amount)} recorded successfully.`);
        fetchBillingData();
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment recording failed.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleOpenRefund = (payment) => {
    setSelectedPayment(payment);
    setRefundFormData({ amount: '', reason: '' });
    setRefundError('');
    setIsRefundModalOpen(true);
  };

  const handleCloseRefund = () => {
    setIsRefundModalOpen(false);
    setSelectedPayment(null);
    setRefundFormData({ amount: '', reason: '' });
    setRefundError('');
  };

  const handleRecordRefund = async (e) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setRefundError('');
    setProcessingRefund(true);
    try {
      const response = await api.post('/billing/payments/refund', {
        paymentId: selectedPayment._id,
        amount: Number(refundFormData.amount),
        reason: refundFormData.reason.trim()
      });
      if (response.data.success) {
        handleCloseRefund();
        setMessage(`Refund of ${formatCurrency(refundFormData.amount)} recorded successfully.`);
        await fetchBillingData();
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (requestError) {
      setRefundError(requestError.response?.data?.message || 'Refund could not be recorded.');
    } finally {
      setProcessingRefund(false);
    }
  };

  const filteredInvoices = invoices.filter((i) => {
    const matchesSearch =
      i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.guestId?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Folio Invoices</h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate itemized tax invoices and record multi-method settlements
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Tabs */}
      <nav className="overflow-x-auto border-b border-slate-200" aria-label="Billing sections">
        <div className="flex min-w-max">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-all sm:px-6 ${
            activeTab === 'invoices'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Invoices ({invoices.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-all sm:px-6 ${
            activeTab === 'payments'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Transactions ({payments.length})</span>
        </button>
        </div>
      </nav>

      {activeTab === 'invoices' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice # or guest..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <Select
              size="sm"
              className="max-w-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Invoice Statuses' },
                { value: 'issued', label: 'Issued' },
                { value: 'paid', label: 'Paid' },
                { value: 'partially_paid', label: 'Partially Paid' },
                { value: 'refunded', label: 'Refunded' }
              ]}
            />
          </div>

          <Card>
            {loading ? (
              <LoadingSpinner text="Loading invoices..." />
            ) : filteredInvoices.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No invoices found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                      <th className="pb-3">Invoice #</th>
                      <th className="pb-3">Guest Name</th>
                      <th className="pb-3">Issued Date</th>
                      <th className="pb-3">Total Amount</th>
                      <th className="pb-3">Paid Amount</th>
                      <th className="pb-3">Balance Due</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 font-bold text-slate-900 font-mono">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 font-semibold text-slate-800">
                          {inv.guestId?.name || 'Guest'}
                        </td>
                        <td className="py-3.5 text-slate-500">
                          {dayjs(inv.createdAt).format('MMM D, YYYY')}
                        </td>
                        <td className="py-3.5 font-bold text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                        <td className="py-3.5 font-medium text-emerald-600">{formatCurrency(inv.paidAmount)}</td>
                        <td className="py-3.5 font-black text-rose-600">
                          {formatCurrency(inv.balanceAmount)}
                        </td>
                        <td className="py-3.5">
                          <Badge variant={inv.status}>{inv.status}</Badge>
                        </td>
                        <td className="py-3.5 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={FileText}
                            className="!p-2"
                            aria-label={`View and print invoice ${inv.invoiceNumber}`}
                            title="View and print invoice"
                            onClick={() => handleOpenInvoice(inv._id)}
                          />
                          {inv.balanceAmount > 0 && (
                            <Button
                              size="sm"
                              variant="primary"
                              icon={DollarSign}
                              className="!p-2"
                              aria-label={`Record payment for invoice ${inv.invoiceNumber}`}
                              title="Record payment"
                              onClick={() => handleOpenPayment(inv)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === 'payments' && (
        <Card>
          {loading ? (
            <LoadingSpinner text="Loading payment transactions..." />
          ) : payments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No payments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                    <th className="pb-3">Transaction Ref</th>
                    <th className="pb-3">Booking Ref</th>
                    <th className="pb-3">Invoice Number</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Recorded At</th>
                    <th className="pb-3">Recorded By</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-mono font-bold text-slate-900">{p.transactionRef || p._id}</td>
                      <td className="py-3 font-medium text-slate-700">{p.reservationId?.bookingReference || 'Folio'}</td>
                      <td className="py-3 font-mono text-slate-500">{p.invoiceId?.invoiceNumber}</td>
                      <td className="py-3">
                        <span className="capitalize font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-3 font-black text-emerald-600">
                        <div>{formatCurrency(p.amount)}</div>
                        {p.refundedAmount > 0 && (
                          <div className="mt-1 text-[10px] font-medium text-rose-600">
                            Refunded {formatCurrency(p.refundedAmount)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-slate-500">{dayjs(p.paymentDate).format('YYYY-MM-DD HH:mm')}</td>
                      <td className="py-3 text-slate-600">{p.recordedBy?.name || 'Staff'}</td>
                      <td className="py-3 text-right">
                        {p.refundableAmount > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={RotateCcw}
                            className="!p-2"
                            aria-label={`Record refund for payment ${p.transactionRef || p._id}`}
                            title={`Record refund (up to ${formatCurrency(p.refundableAmount)})`}
                            onClick={() => handleOpenRefund(p)}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Printable Invoice Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Folio Tax Invoice"
        maxWidth="max-w-2xl"
        footer={
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={Printer}
              onClick={() => window.print()}
            >
              Print Invoice
            </Button>
            <Button variant="secondary" onClick={() => setIsInvoiceModalOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedInvoice && (
          <div id="printable-invoice" className="p-4 bg-white text-slate-800 space-y-6 text-xs">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-xl font-black text-brand-950 uppercase tracking-tight">
                  {selectedInvoice.hotelId?.name || 'Nestnn'}
                </h2>
                <p className="text-slate-500 mt-1">{selectedInvoice.hotelId?.address}</p>
                <p className="text-slate-500">
                  {selectedInvoice.hotelId?.city}, {selectedInvoice.hotelId?.state} {selectedInvoice.hotelId?.country}
                </p>
                <p className="text-slate-500 mt-0.5">Tax Registration: {selectedInvoice.hotelId?.taxNumber || 'US-TAX-893201'}</p>
              </div>

              <div className="text-right">
                <span className="text-xs font-black bg-brand-600 text-white px-3 py-1 rounded-full uppercase tracking-wider">
                  Tax Invoice
                </span>
                <p className="text-base font-black text-slate-900 font-mono mt-3">
                  #{selectedInvoice.invoiceNumber}
                </p>
                <p className="text-slate-400 mt-0.5">
                  Date: {dayjs(selectedInvoice.createdAt).format('MMMM D, YYYY')}
                </p>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
              <div>
                <span className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                  Billed To
                </span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {selectedInvoice.guestId?.name}
                </p>
                <p className="text-slate-500">{selectedInvoice.guestId?.phone}</p>
                <p className="text-slate-500">{selectedInvoice.guestId?.email}</p>
              </div>

              {selectedInvoice.reservationId && (
                <div className="text-right">
                  <span className="font-bold uppercase text-[10px] text-slate-400 tracking-wider">
                    Reservation Details
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    Ref: {selectedInvoice.reservationId?.bookingReference}
                  </p>
                  <p className="text-slate-500">
                    Stay: {dayjs(selectedInvoice.reservationId?.checkInDate).format('YYYY-MM-DD')} to {dayjs(selectedInvoice.reservationId?.checkOutDate).format('YYYY-MM-DD')}
                  </p>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{item.description}</td>
                      <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-2 border-t border-slate-200 pt-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-mono">-{formatCurrency(selectedInvoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Taxes ({selectedInvoice.taxRatePercent || 10}%):</span>
                  <span className="font-mono font-semibold">{formatCurrency(selectedInvoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                  <span>Total Due:</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Payments Received:</span>
                  <span className="font-mono">-{formatCurrency(selectedInvoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-rose-700 border-t border-slate-200 pt-2">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatCurrency(selectedInvoice.balanceAmount)}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 text-center text-slate-400 text-[10px]">
              Thank you for choosing {selectedInvoice.hotelId?.name || 'Nestnn Hotels'}. We hope you enjoy your stay!
            </div>
          </div>
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment Settlement"
        subtitle={`Invoice: ${selectedInvoice?.invoiceNumber}`}
      >
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            label={`Payment Amount (${currencySymbol})`}
            type="number"
            step="0.01"
            required
            value={payFormData.amount}
            onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
            placeholder="0.00"
          />

          <Select
            label="Settlement Method"
            value={payFormData.method}
            onChange={(e) => setPayFormData({ ...payFormData, method: e.target.value })}
            options={[
              { label: 'Cash at Front Desk', value: 'cash' },
              { label: 'Credit / Debit Card Terminal', value: 'card' },
              { label: 'UPI QR Payment', value: 'upi' },
              { label: 'Bank Wire Transfer', value: 'bank_transfer' }
            ]}
          />

          <Input
            label="Transaction / Authorization Ref"
            value={payFormData.transactionRef}
            onChange={(e) => setPayFormData({ ...payFormData, transactionRef: e.target.value })}
            placeholder="e.g. POS-98421 or CASH-REC-01"
          />

          <Input
            label="Notes"
            value={payFormData.notes}
            onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
            placeholder="Collected at checkout"
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={processingPayment}>
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isRefundModalOpen}
        onClose={handleCloseRefund}
        title="Record Refund"
        subtitle="Record the refund after returning funds to the guest using your usual process."
      >
        {refundError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {refundError}
          </div>
        )}
        {selectedPayment && (
          <form onSubmit={handleRecordRefund} className="space-y-4">
            <div className="rounded-xl border border-orvelle-border bg-orvelle-ivory/60 p-3 text-sm">
              <p>Original payment: <strong>{formatCurrency(selectedPayment.amount)}</strong></p>
              <p>Refundable balance: <strong>{formatCurrency(selectedPayment.refundableAmount)}</strong></p>
              <p className="capitalize">Method: <strong>{selectedPayment.method.replace(/_/g, ' ')}</strong></p>
            </div>
            <Input
              label={`Refund Amount (${currencySymbol})`}
              type="number"
              min="0.01"
              max={selectedPayment.refundableAmount}
              step="0.01"
              required
              value={refundFormData.amount}
              onChange={(event) => setRefundFormData((current) => ({ ...current, amount: event.target.value }))}
              placeholder="Enter refund amount"
              helperText={`Maximum refund: ${formatCurrency(selectedPayment.refundableAmount)}`}
            />
            <div>
              <label htmlFor="refund-reason" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-orvelle-primary">
                Refund Reason <span className="text-orvelle-error">*</span>
              </label>
              <textarea
                id="refund-reason"
                required
                rows={3}
                maxLength={500}
                value={refundFormData.reason}
                onChange={(event) => setRefundFormData((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Enter the reason for this refund"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-orvelle-text placeholder:text-orvelle-muted focus:border-orvelle-champagne focus:outline-none focus:ring-2 focus:ring-orvelle-champagne/30"
              />
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="secondary" type="button" onClick={handleCloseRefund}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={processingRefund}>
                Confirm Refund
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
