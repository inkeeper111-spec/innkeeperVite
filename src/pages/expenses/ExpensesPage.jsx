import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { DollarSign, PlusCircle, Filter, CheckCircle2, TrendingDown } from 'lucide-react';
import dayjs from 'dayjs';

export const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [categorySummary, setCategorySummary] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'supplies',
    amount: '',
    description: '',
    paymentMethod: 'bank_transfer',
    date: dayjs().format('YYYY-MM-DD')
  });

  const [message, setMessage] = useState('');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/expenses');
      if (res.data.success) {
        setExpenses(res.data.data.expenses);
        setCategorySummary(res.data.data.categorySummary);
        setMonthlyTotal(res.data.data.monthlyTotal || 0);
        setMonthlySummary(res.data.data.monthlySummary || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/expenses', {
        ...expenseForm,
        amount: Number(expenseForm.amount)
      });
      if (res.data.success) {
        setIsRecordOpen(false);
        setMessage('Expense recorded successfully.');
        setExpenseForm({
          category: 'supplies',
          amount: '',
          description: '',
          paymentMethod: 'bank_transfer',
          date: dayjs().format('YYYY-MM-DD')
        });
        fetchExpenses();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record expense');
    }
  };

  const totalApproved = expenses.reduce((sum, e) => (e.status === 'approved' ? sum + e.amount : sum), 0);

  const filteredExpenses = expenses.filter(
    (e) => categoryFilter === 'all' || e.category === categoryFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Operating Expenses</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track overhead costs, vendor payments, utility bills, supplies, and departmental expenditures
          </p>
        </div>

        <Button variant="primary" icon={PlusCircle} onClick={() => setIsRecordOpen(true)}>
          Record Expense
        </Button>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Operating Outflow</span>
            <div className="p-2 rounded-xl bg-white/10 text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black mt-2">${Number(monthlyTotal || totalApproved).toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">Approved expenses this month · {monthlySummary.length} categories</p>
        </Card>

        {categorySummary.slice(0, 2).map((cat) => (
          <Card key={cat._id}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 capitalize">
                {cat._id.replace(/_/g, ' ')}
              </span>
              <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">${cat.total.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-2">Departmental total</p>
          </Card>
        ))}
      </div>

      {/* Expenses Table */}
      <Card>
        {loading ? (
          <LoadingSpinner text="Retrieving expense ledger..." />
        ) : filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No expenses recorded for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Voucher #</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-mono font-bold text-slate-900">{exp.expenseNumber}</td>
                    <td className="py-3 capitalize font-semibold text-brand-700">
                      {exp.category.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 text-slate-700 font-medium">{exp.description}</td>
                    <td className="py-3 font-black text-slate-900">${exp.amount}</td>
                    <td className="py-3 uppercase text-slate-500 text-[11px]">{exp.paymentMethod.replace(/_/g, ' ')}</td>
                    <td className="py-3 text-slate-500">{dayjs(exp.date).format('YYYY-MM-DD')}</td>
                    <td className="py-3 text-right">
                      <Badge variant={exp.status}>{exp.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record Expense Modal */}
      <Modal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        title="Record Operating Expense"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Expense Category"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              options={[
                { label: 'Salaries & Wages', value: 'salaries' },
                { label: 'Electricity Utility', value: 'electricity' },
                { label: 'Water & Sewage', value: 'water' },
                { label: 'High-Speed Internet & IT', value: 'internet' },
                { label: 'Repairs & Facility Maintenance', value: 'repairs' },
                { label: 'Hotel Supplies & Consumables', value: 'supplies' },
                { label: 'Food & Beverage Procurement', value: 'food_beverage' },
                { label: 'Vendor Payments', value: 'vendor_payment' },
                { label: 'Marketing & Advertising', value: 'marketing' },
                { label: 'Miscellaneous Operating', value: 'miscellaneous' }
              ]}
            />
            <Input
              label="Amount ($)"
              type="number"
              step="0.01"
              required
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <Input
            label="Description / Purpose"
            required
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
            placeholder="e.g. Monthly commercial electricity bill"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Disbursement Method"
              value={expenseForm.paymentMethod}
              onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
              options={[
                { label: 'Bank Wire / ACH', value: 'bank_transfer' },
                { label: 'Credit Card', value: 'credit_card' },
                { label: 'Cash Disbursement', value: 'cash' },
                { label: 'Commercial Cheque', value: 'cheque' }
              ]}
            />
            <Input
              label="Expense Date"
              type="date"
              required
              value={expenseForm.date}
              onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setIsRecordOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

