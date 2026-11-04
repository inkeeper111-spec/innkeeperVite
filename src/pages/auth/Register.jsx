import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { Select } from '../../components/ui/Select';
import { Building2, CheckCircle2 } from 'lucide-react';
import { NestnnLogo } from '../../components/ui/NestnnLogo';

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
    country: 'India',
    postalCode: '',
    currency: 'INR'
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
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-slate-900 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="z-10 mx-auto w-full min-w-0 sm:max-w-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <NestnnLogo size="lg" dark />
          </div>
          <h2 className="break-words text-2xl font-black text-white tracking-tight">Register Your Hotel</h2>
          <p className="text-sm text-slate-400 mt-1">
            Submit your hotel details for Super Admin approval.
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-100 bg-white px-4 py-6 shadow-2xl sm:px-10 sm:py-8">
          {error && (
            <div className="mb-5 break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>
                Your hotel registration has been submitted successfully. Our Super Admin team will review your application. You will receive a notification once your registration is approved.
              </span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hotel Property Information</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  { label: 'INR (₹)', value: 'INR' },
                  { label: 'USD ($)', value: 'USD' },
                  { label: 'EUR (€)', value: 'EUR' },
                  { label: 'GBP (£)', value: 'GBP' },
                  { label: 'CAD ($)', value: 'CAD' },
                  { label: 'AUD ($)', value: 'AUD' }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Your Full Name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Jane Doe"
              />
              <PhoneInput
                label="Phone Number"
                required
                value={formData.phone}
                defaultCountry={formData.country}
                onChange={(phone) => setFormData({ ...formData, phone })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              Submit Hotel Registration
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
