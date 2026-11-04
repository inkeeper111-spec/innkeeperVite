import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, CreditCard, LoaderCircle, LockKeyhole } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const money = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})}`;

export const SubscriptionSelection = () => {
  const navigate = useNavigate();
  const { user, hotel, refreshUser } = useAuth();
  const [modules, setModules] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [minimumMonthlyAmount, setMinimumMonthlyAmount] = useState(999);
  const [selected, setSelected] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/subscriptions/options')
      .then(({ data }) => {
        if (!active) return;
        const options = data.data;
        setModules(options.modules);
        setMinimumMonthlyAmount(options.minimumMonthlyAmount);
        setCurrentSubscription(options.currentSubscription);
        const current = options.currentSubscription;
        const initialKeys = current?.selectedModules?.length
          ? current.selectedModules.filter((key) => !current.scheduledModuleRemovals?.includes(key))
          : [];
        setSelected(initialKeys);
        setBillingCycle(current?.billingCycle || 'monthly');
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load subscription options.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const pricing = useMemo(() => {
    const priceField = billingCycle === 'annual' ? 'annualPrice' : 'monthlyPrice';
    const moduleTotal = modules
      .filter((module) => selected.includes(module.key))
      .reduce((sum, module) => sum + Number(module[priceField]), 0);
    const minimum = billingCycle === 'annual' ? minimumMonthlyAmount * 12 : minimumMonthlyAmount;
    return {
      moduleTotal,
      minimum,
      finalAmount: Math.max(minimum, moduleTotal),
      minimumApplied: moduleTotal < minimum
    };
  }, [billingCycle, minimumMonthlyAmount, modules, selected]);

  const toggleModule = (key) => {
    setError('');
    setSelected((previous) => previous.includes(key)
      ? previous.filter((selectedKey) => selectedKey !== key)
      : [...previous, key]);
  };

  const scheduleRemovals = async (removedKeys) => {
    const { data } = await api.post('/subscriptions/module-removals', { moduleKeys: removedKeys });
    setNotice(data.message);
    const result = await api.get('/subscriptions/options');
    setCurrentSubscription(result.data.data.currentSubscription);
  };

  const startCheckout = async () => {
    setError('');
    setNotice('');
    const currentKeys = currentSubscription?.selectedModules || [];
    const removedKeys = currentKeys.filter((key) => !selected.includes(key));
    const addedKeys = selected.filter((key) => !currentKeys.includes(key));
    if (currentSubscription?.status === 'active' && removedKeys.length && !addedKeys.length) {
      try {
        await scheduleRemovals(removedKeys);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to schedule module removals.');
      }
      return;
    }
    if (!selected.length) {
      setError('Select at least one module to continue.');
      return;
    }
    if (currentSubscription?.status === 'active' && removedKeys.length && addedKeys.length) {
      setError('Save module removals for the next billing cycle separately before adding modules.');
      return;
    }

    setCheckoutBusy(true);
    try {
      const sdkLoaded = await loadRazorpay();
      if (!sdkLoaded) throw new Error('Razorpay Checkout could not be loaded. Check your connection and try again.');
      const { data } = await api.post('/subscriptions/orders', { selectedModules: selected, billingCycle });
      const checkout = data.data;
      if (!checkout.keyId || checkout.keyId.includes('placeholder')) {
        throw new Error('Razorpay is not configured yet. Please contact the platform administrator.');
      }
      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        amount: checkout.order.amount,
        currency: checkout.currency,
        name: 'Nestnn',
        description: `${checkout.billingCycle === 'annual' ? 'Annual' : 'Monthly'} hotel subscription`,
        order_id: checkout.order.id,
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        notes: { subscriptionId: String(checkout.subscriptionId) },
        theme: { color: '#b77932' },
        handler: async (response) => {
          try {
            await api.post('/subscriptions/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            await refreshUser();
            navigate('/subscription/success', {
              replace: true,
              state: {
                amount: checkout.finalAmount,
                billingCycle: checkout.billingCycle,
                modules: checkout.selectedModules
              }
            });
          } catch (verificationError) {
            navigate('/subscription/failure', {
              replace: true,
              state: { message: verificationError.response?.data?.message || 'Payment was received but could not be verified. Please retry or contact support.' }
            });
            setCheckoutBusy(false);
          }
        },
        modal: {
          ondismiss: () => setCheckoutBusy(false)
        }
      });
      razorpay.on('payment.failed', async (event) => {
        try {
          await api.post('/subscriptions/failure', { razorpayOrderId: checkout.order.id });
        } catch (failureError) {
          console.error('Unable to record subscription payment failure:', failureError);
        }
        navigate('/subscription/failure', {
          replace: true,
          state: { message: event.error?.description || 'Payment failed. You can try checkout again.' }
        });
        setCheckoutBusy(false);
      });
      razorpay.open();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to start checkout.');
      setCheckoutBusy(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Loading subscription options...</div>;
  }

  const registrationStatus = hotel?.registrationStatus || (hotel?.status === 'pending_approval' ? 'pending' : 'approved');
  if (registrationStatus !== 'approved') {
    const messages = {
      pending: 'Your hotel registration is awaiting Super Admin review. Subscription options will unlock after approval.',
      rejected: `Your hotel registration was rejected.${hotel?.rejectionReason ? ` Reason: ${hotel.rejectionReason}` : ''}`,
      suspended: 'Your hotel account is suspended. Contact platform support for assistance.'
    };
    return (
      <div className="mx-auto max-w-2xl px-3 py-12 sm:px-0 sm:py-16">
        <Card className="p-5 text-center sm:p-8">
          <LockKeyhole className="mx-auto mb-4 h-10 w-10 text-amber-700" />
          <h1 className="text-2xl font-bold text-slate-900">Registration {registrationStatus}</h1>
          <p className="mt-3 text-slate-600">{messages[registrationStatus]}</p>
        </Card>
      </div>
    );
  }

  const currentIsActive = currentSubscription?.status === 'active'
    && new Date(currentSubscription.endDate) > new Date();
  const expired = currentSubscription && new Date(currentSubscription.endDate) <= new Date();

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl space-y-6 px-3 pb-12 sm:px-0">
      <header className="rounded-3xl bg-slate-900 px-5 py-6 text-white sm:px-10 sm:py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Nestnn subscriptions</p>
        <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">{expired ? 'Renew your subscription' : currentIsActive ? 'Manage hotel modules' : 'Choose your modules'}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Select the tools your hotel needs. Your bill is the selected module total, subject to the minimum subscription amount.
        </p>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      {['pending', 'past_due'].includes(currentSubscription?.status) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          A payment is awaiting verification. You may retry checkout; paid module access remains disabled until verification succeeds.
        </div>
      )}
      {hotel?.subscriptionStatus === 'suspended' && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Your subscription has been suspended by platform administration. Contact support to restore paid module access.
        </div>
      )}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Available modules</h2>
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
              <span>Billing period</span>
              <div className="w-36 shrink-0">
                <Select
                  aria-label="Billing period"
                  value={billingCycle}
                  onChange={(event) => setBillingCycle(event.target.value)}
                  options={[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'annual', label: 'Annual' }
                  ]}
                  size="sm"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((module) => {
              const isSelected = selected.includes(module.key);
              const price = billingCycle === 'annual' ? module.annualPrice : module.monthlyPrice;
              return (
                <button
                  type="button"
                  key={module.key}
                  onClick={() => toggleModule(module.key)}
                  aria-pressed={isSelected}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isSelected ? 'border-amber-600 bg-amber-50 ring-1 ring-amber-600' : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words">
                      <span className="block font-semibold text-slate-900">{module.name}</span>
                      {module.description && <span className="mt-1 block text-xs text-slate-500">{module.description}</span>}
                    </span>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isSelected ? 'bg-amber-700 text-white' : 'border border-slate-300 text-transparent'}`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  </span>
                  <span className="mt-4 block text-lg font-bold text-slate-900">{money(price)}<span className="text-xs font-normal text-slate-500"> / {billingCycle === 'annual' ? 'year' : 'month'}</span></span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <Card className="space-y-5 p-5">
            <div>
              <p className="text-sm font-semibold text-slate-500">Selected modules</p>
              <p className="mt-1 text-3xl font-black text-slate-900">{selected.length}</p>
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-slate-600"><span>Selected module total</span><strong>{money(pricing.moduleTotal)}</strong></div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-slate-600"><span>Minimum {billingCycle} amount</span><strong>{money(pricing.minimum)}</strong></div>
              {pricing.minimumApplied && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">The minimum subscription amount applies; it is not added to your module total.</p>}
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-base font-bold text-slate-900"><span>Final payable</span><span>{money(pricing.finalAmount)}</span></div>
            </div>
            {currentIsActive && currentSubscription?.scheduledModuleRemovals?.length > 0 && (
              <p className="text-xs text-slate-500">Scheduled removals: {currentSubscription.scheduledModuleRemovals.join(', ')} at {new Date(currentSubscription.scheduledChangesAt || currentSubscription.endDate).toLocaleDateString()}.</p>
            )}
            <Button className="w-full" size="lg" icon={CreditCard} loading={checkoutBusy}
              disabled={hotel?.subscriptionStatus === 'suspended'} onClick={startCheckout}>
              {currentIsActive && selected.length < (currentSubscription?.selectedModules?.length || 0)
                ? 'Schedule module removals'
                : 'Continue to Razorpay'}
            </Button>
            <p className="flex items-center justify-center gap-1 text-center text-xs text-slate-500"><LockKeyhole className="h-3 w-3" />Modules activate only after payment verification.</p>
          </Card>
        </aside>
      </div>
    </main>
  );
};
