import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Search, Printer, ArrowLeft, CheckCircle2, Building2 } from 'lucide-react';
import dayjs from 'dayjs';

export const BookingLookupPage = () => {
  const [searchParams] = useSearchParams();
  const [reference, setReference] = useState(searchParams.get('reference') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    if (!reference || !email) return;

    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/public/bookings/lookup?reference=${reference.trim()}&email=${email.trim()}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'No reservation found matching the provided details.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('reference') && searchParams.get('email')) {
      handleLookup();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hotel Portal</span>
        </Link>

        {/* Lookup Card */}
        <Card title="Find My Reservation & Invoice" subtitle="Enter your booking reference code and booking email">
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Booking Reference #"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. BK-2026-9014"
              />
              <Input
                label="Primary Guest Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@example.com"
              />
            </div>

            <Button type="submit" variant="primary" loading={loading} className="w-full">
              Lookup Reservation
            </Button>
          </form>
        </Card>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        {/* Reservation & Invoice Display */}
        {data && (
          <Card className="space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Official Stay Confirmation
                </span>
                <h2 className="text-xl font-black text-slate-900 font-mono mt-1">
                  {data.reservation.bookingReference}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {data.reservation.hotelId?.name} • {data.reservation.hotelId?.city}
                </p>
              </div>

              <Badge variant={data.reservation.status} size="md">
                {data.reservation.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px]">Guest Name</span>
                <p className="font-bold text-slate-900 mt-0.5">{data.reservation.guestName}</p>
                <p className="text-slate-500">{data.reservation.guestEmail}</p>
              </div>

              <div>
                <span className="text-slate-400 uppercase font-bold text-[10px]">Stay Interval</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {dayjs(data.reservation.checkInDate).format('MMM D, YYYY')} to {dayjs(data.reservation.checkOutDate).format('MMM D, YYYY')}
                </p>
              </div>
            </div>

            {/* Invoiced items */}
            {data.invoice && (
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Itemized Charges ({data.invoice.invoiceNumber})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.invoice.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium text-slate-800">{it.description}</td>
                          <td className="py-2 px-3 text-center">{it.quantity}</td>
                          <td className="py-2 px-3 text-right font-mono">${it.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2 text-xs">
                  <div className="w-56 space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono">${data.invoice.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxes:</span>
                      <span className="font-mono">${data.invoice.taxAmount}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                      <span>Total Amount:</span>
                      <span className="font-mono">${data.invoice.totalAmount}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-700">
                      <span>Remaining Balance:</span>
                      <span className="font-mono">${data.invoice.balanceAmount}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="outline" icon={Printer} onClick={() => window.print()}>
                Print Voucher
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

