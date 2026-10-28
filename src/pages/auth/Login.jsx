import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Building2, Shield, User, Utensils, Sparkles, Wrench, Eye, EyeOff } from 'lucide-react';
import { InnkeeperLogo } from '../../components/ui/InnkeeperLogo';
import { Modal } from '../../components/ui/Modal';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoWorkspaces, setShowDemoWorkspaces] = useState(false);
  const registrationMessage = location.state?.registrationMessage;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      navigate(data.data.homePath || (data.data.user.role === 'super_admin' ? '/superadmin' : '/dashboard'));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoWorkspace = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setShowDemoWorkspaces(false);
  };

  const demoAccounts = [
    { label: 'Product Admin', email: 'superadmin@grandstayhms.com', pass: 'AdminPassword123!', icon: Shield, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { label: 'Grand Regal GM', email: 'admin@grandregal.com', pass: 'HotelPassword123!', icon: Building2, color: 'text-brand-600 bg-brand-50 border-brand-200' },
    { label: 'Continental GM', email: 'ranjithraja325@gmail.com', pass: 'HotelPassword123!', icon: Building2, color: 'text-amber-700 bg-amber-50 border-amber-200' },
    { label: 'Front Desk', email: 'reception@grandregal.com', pass: 'StaffPassword123!', icon: User, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { label: 'Restaurant Chef', email: 'chef@grandregal.com', pass: 'StaffPassword123!', icon: Utensils, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Housekeeping', email: 'cleaning@grandregal.com', pass: 'StaffPassword123!', icon: Sparkles, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { label: 'Maintenance', email: 'tech@grandregal.com', pass: 'StaffPassword123!', icon: Wrench, color: 'text-slate-700 bg-slate-100 border-slate-300' },
    { label: 'Continental Desk', email: 'receptionist@continental.com', pass: 'StaffPassword123!', icon: User, color: 'text-teal-700 bg-teal-50 border-teal-200' }
  ];

  return (
    <main className="h-screen h-[100dvh] overflow-hidden bg-[#d8cec1] lg:p-3 xl:p-5">
      <section className="mx-auto h-full max-w-[1500px] overflow-hidden bg-[#f7f4ef] lg:rounded-[28px] lg:shadow-[0_24px_80px_rgba(41,24,16,0.28)]">
        <div className="grid h-full lg:grid-cols-[58%_42%]">
          <div
            className="relative hidden overflow-hidden bg-cover bg-center lg:block"
            style={{ backgroundImage: "url('/login-landscape.jpg')" }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(26,25,22,0.42),rgba(26,25,22,0.04)_62%,rgba(26,25,22,0.18))]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,12,12,0.18),transparent_30%,rgba(12,12,12,0.42))]" />

            <div className="absolute left-10 right-10 top-8 flex items-center justify-between text-white">
              <div className="rounded-full border border-white/25 bg-black/15 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] backdrop-blur-md">
                InnKeeper · Hospitality Suite
              </div>
              <span className="hidden text-xs font-medium text-white/80 xl:block">Your hotel, beautifully managed</span>
            </div>

            <div className="absolute bottom-10 left-10 right-10 text-white xl:bottom-14 xl:left-14">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.34em] text-[#edcf91]">Welcome to hospitality</p>
              <h1 className="max-w-xl text-5xl font-light leading-[0.9] tracking-[-0.045em] xl:text-7xl">
                Every stay,
                <span className="block font-serif italic">exceptional.</span>
              </h1>
              <p className="mt-5 max-w-md text-sm leading-6 text-white/75">
                One elegant workspace for operations, guests and the people who make every stay memorable.
              </p>
            </div>
          </div>

          <div className="relative flex min-h-0 items-center justify-center px-3 py-3 sm:px-8 sm:py-5 lg:px-10 lg:py-6 xl:px-16">

            <div className="absolute inset-0 lg:hidden">
              <img src="/login-landscape.jpg" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[#211711]/75 backdrop-blur-sm" />
            </div>

            <div className="login-card relative max-h-full w-full max-w-[430px] overflow-y-auto rounded-[20px] bg-white/95 px-4 py-4 shadow-[0_20px_70px_rgba(38,27,19,0.22)] backdrop-blur-xl sm:px-8 sm:py-6 lg:overflow-visible lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none lg:backdrop-blur-none">
              <div className="login-brand mb-5 flex justify-center lg:mb-6 lg:justify-start">
                <InnkeeperLogo size="lg" />
              </div>

              <div className="login-heading mb-5 lg:mb-6">
                <p className="login-eyebrow mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#b17c35] lg:mb-2">Secure workspace</p>
                <h2 className="text-2xl font-black tracking-tight text-[#30231d] sm:text-3xl lg:text-[38px]">Welcome back</h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">Sign in to manage your hotel operations.</p>
              </div>

              {error && (
                <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

              {registrationMessage && (
                <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                  {registrationMessage}
                </div>
              )}

              <form className="login-form space-y-3 sm:space-y-4 lg:space-y-5" onSubmit={handleSubmit}>
                <Input
                  label="Work Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hotel.com"
                  className="h-12 rounded-xl"
                />

                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 rounded-xl pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute bottom-3 right-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#b17c35]" defaultChecked />
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="font-bold text-[#9c6b2c] hover:text-[#704619]">
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" loading={loading} className="h-12 w-full rounded-xl bg-[#30231d] hover:bg-[#241a15]" size="lg">
                  Sign in
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setShowDemoWorkspaces(true)}
                className="login-demo-trigger mt-4 w-full border-t border-slate-200 pt-4 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-[#9c6b2c]"
              >
                Demo workspace
              </button>

              <p className="login-register mt-4 text-center text-xs text-slate-500">
                Creating a new property?{' '}
                <Link to="/register" className="font-bold text-[#9c6b2c] hover:text-[#704619]">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Modal
        isOpen={showDemoWorkspaces}
        onClose={() => setShowDemoWorkspaces(false)}
        title="Choose a demo workspace"
        subtitle="Select a role to prefill the sign-in credentials."
        maxWidth="max-w-2xl"
        footer={(
          <Button type="button" variant="ghost" onClick={() => setShowDemoWorkspaces(false)}>
            Cancel
          </Button>
        )}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {demoAccounts.map((account) => {
            const Icon = account.icon;
            return (
              <button
                key={account.label}
                type="button"
                onClick={() => handleDemoWorkspace(account.email, account.pass)}
                className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${account.color}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-current/10 bg-white/70">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{account.label}</span>
                  <span className="mt-0.5 block truncate text-[10px] opacity-70">Prefill demo credentials</span>
                </span>
              </button>
            );
          })}
        </div>
      </Modal>
    </main>
  );
};

