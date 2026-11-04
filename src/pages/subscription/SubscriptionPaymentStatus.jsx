import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, CreditCard, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';

const money = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})}`;

export const SubscriptionPaymentStatus = ({ success }) => {
  const location = useLocation();
  const payment = location.state || {};
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-xl p-5 text-center sm:p-10">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {success ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
        </div>
        <p className="mt-5 break-words text-xs font-bold uppercase tracking-[0.12em] text-slate-500 sm:tracking-[0.18em]">Nestnn subscription checkout</p>
        <h1 className="mt-2 break-words text-xl font-black text-slate-900 sm:text-2xl">
          {success ? 'Payment verified' : 'Payment could not be completed'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {success
            ? 'Your payment has been verified and the selected hotel modules are active.'
            : payment.message || 'No modules were activated. You can return to checkout and try again.'}
        </p>
        {success && (
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left text-sm">
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1"><span className="text-slate-500">Paid</span><strong>{money(payment.amount)}</strong></div>
            <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1"><span className="text-slate-500">Billing cycle</span><strong className="capitalize">{payment.billingCycle || 'monthly'}</strong></div>
            {payment.modules?.length > 0 && (
              <p className="mt-2 break-words text-slate-600">Modules: {payment.modules.join(', ')}</p>
            )}
          </div>
        )}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {success ? (
            <Link to="/dashboard" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:w-auto">
              <CheckCircle2 className="h-4 w-4" />Open hotel dashboard
            </Link>
          ) : (
            <Link to="/subscription" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:w-auto">
              <CreditCard className="h-4 w-4" />Retry checkout
            </Link>
          )}
        </div>
      </Card>
    </main>
  );
};
