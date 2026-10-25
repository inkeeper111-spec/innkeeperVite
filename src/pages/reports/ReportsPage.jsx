import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  PieChart,
  FileSpreadsheet
} from 'lucide-react';

export const ReportsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/financial');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownloadCSV = (type) => {
    const token = localStorage.getItem('accessToken');
    const url = `${import.meta.env.VITE_API_URL || '/api/v1'}/reports/export?type=${type}`;

    // Trigger download with auth token
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `${type}-export.csv`;
        link.click();
      });
  };

  if (loading) return <LoadingSpinner text="Compiling financial reports..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Reporting & Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated accounting summaries, collection ratios, channel distributions, and audit ledger exports
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={FileSpreadsheet}
            onClick={() => handleDownloadCSV('reservations')}
          >
            Export Bookings CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={() => handleDownloadCSV('invoices')}
          >
            Export Invoices CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Invoiced</span>
          <p className="text-2xl font-black text-slate-900 mt-2">${data?.totalInvoiced?.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{data?.invoicesCount} invoices issued</p>
        </Card>

        <Card>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Collected Revenue</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">${data?.totalCollected?.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">{data?.paymentsCount} cleared payments</p>
        </Card>

        <Card>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Outstanding Balance</span>
          <p className="text-2xl font-black text-rose-600 mt-2">${data?.totalOutstanding?.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Receivables in collection</p>
        </Card>
      </div>

      {/* Payment Methods Breakdown */}
      <Card title="Payment Method Collections" subtitle="Disbursement distribution across merchant channels">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
          {Object.entries(data?.paymentByMethod || {}).map(([method, amount]) => (
            <div key={method} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 capitalize">
                {method.replace(/_/g, ' ')}
              </span>
              <p className="text-xl font-black text-slate-900 mt-1">${amount.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

