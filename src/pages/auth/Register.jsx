import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Building2, CheckCircle2 } from 'lucide-react';
import { InnkeeperLogo } from '../../components/ui/InnkeeperLogo';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    hotelName: '',
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'United States',
    postalCode: '',
    currency: 'USD'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await register(formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', {
          state: { registrationMessage: response.data.approval?.message }
        });
      }, 3500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col justify-center">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl z-10">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <InnkeeperLogo size="lg" dark />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Register Your Hotel</h2>
          <p className="text-sm text-slate-400 mt-1">
            Start your 14-day free trial. Complete multi-tenant SaaS hotel management.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>
                Application submitted for approval. This is the first administrator account for your hotel.
                Product Admin approval is required before you can access the hotel workspace.
              </span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hotel Property Information</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Hotel or Resort Name"
                name="hotelName"
                required
                value={formData.hotelName}
                onChange={handleChange}
                placeholder="The Grand Palm Resort"
              />
              <Select
                label="Operating Currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                options={[
                  { label: 'USD ($)', value: 'USD' },
                  { label: 'EUR (€)', value: 'EUR' },
                  { label: 'GBP (£)', value: 'GBP' },
                  { label: 'INR (₹)', value: 'INR' },
                  { label: 'CAD ($)', value: 'CAD' },
                  { label: 'AUD ($)', value: 'AUD' }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Street Address"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                placeholder="100 Ocean Drive"
              />
              <Input
                label="City"
                name="city"
                required
                value={formData.city}
                onChange={handleChange}
                placeholder="Miami"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="State / Province"
                name="state"
                required
                value={formData.state}
                onChange={handleChange}
                placeholder="FL"
              />
              <Input
                label="Country"
                name="country"
                required
                value={formData.country}
                onChange={handleChange}
                placeholder="United States"
              />
              <Input
                label="Postal Code"
                name="postalCode"
                required
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="33139"
              />
            </div>

            <div className="border-b border-slate-100 pb-3 pt-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Owner & Administrator Account</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Your Full Name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Jane Doe"
              />
              <Input
                label="Phone Number"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Account Email"
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="jane@hotel.com"
              />
              <Input
                label="Password"
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••••"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-4" size="lg">
              Complete Registration & Start Trial
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

