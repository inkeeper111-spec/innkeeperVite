import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CheckCircle2 } from 'lucide-react';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await api.post('/auth/reset-password', { token, newPassword });
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-900 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto w-full min-w-0 sm:max-w-md">
        <h2 className="break-words text-center text-2xl font-black text-white">Choose New Password</h2>
      </div>

      <div className="mx-auto mt-8 w-full min-w-0 sm:max-w-md">
        <div className="min-w-0 rounded-2xl border border-slate-100 bg-white px-4 py-6 shadow-xl sm:px-10 sm:py-8">
          {message && (
            <div className="mb-4 flex min-w-0 items-center gap-2 break-words rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{message} Redirecting to login...</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Reset Token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste token from reset email"
            />
            <Input
              label="New Password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
            />
            <Button type="submit" loading={loading} className="w-full">
              Update Password
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-xs text-brand-600 hover:text-brand-700 font-semibold">
              Cancel & Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
