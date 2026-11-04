import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [devToken, setDevToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
      if (res.data.devResetToken) {
        setDevToken(res.data.devResetToken);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-900 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto w-full min-w-0 sm:max-w-md">
        <h2 className="break-words text-center text-2xl font-black text-white">Reset Password</h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Enter your email address to receive password reset instructions.
        </p>
      </div>

      <div className="mx-auto mt-8 w-full min-w-0 sm:max-w-md">
        <div className="min-w-0 rounded-2xl border border-slate-100 bg-white px-4 py-6 shadow-xl sm:px-10 sm:py-8">
          {message && (
            <div className="mb-4 flex min-w-0 items-start gap-2 break-words rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p>{message}</p>
                {devToken && (
                  <p className="mt-2 break-all rounded bg-emerald-100/60 p-2 font-mono text-[11px] text-emerald-900">
                    Dev Token: <Link to={`/reset-password?token=${devToken}`} className="font-bold underline">{devToken}</Link>
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Registered Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hotel.com"
            />
            <Button type="submit" loading={loading} className="w-full">
              Send Reset Link
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
