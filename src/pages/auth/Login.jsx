import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Building2, Shield, User, Utensils, Sparkles, Wrench, ArrowRight } from 'lucide-react';
import { InnkeeperLogo } from '../../components/ui/InnkeeperLogo';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const handleDemoLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center mb-4">
          <InnkeeperLogo size="lg" dark />
        </div>
        <h2 className="text-center text-sm text-slate-400">Sign in to your hotel operations workspace</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {registrationMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              {registrationMessage}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Work Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@hotel.com"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-brand-600 mr-2" defaultChecked />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-brand-600 hover:text-brand-700 font-semibold">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Sign In to Dashboard
            </Button>
          </form>

          {/* Quick-Fill Demo Roles */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              1-Click Demo Evaluation Roles
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.label}
                    type="button"
                    onClick={() => handleDemoLogin(acc.email, acc.pass)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all hover:scale-[1.02] ${acc.color}`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs font-semibold truncate">{acc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Register a new property?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Create Hotel Account
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors">
            <span>Back to Public Guest Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

