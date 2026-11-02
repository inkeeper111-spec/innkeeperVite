import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock3, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';

const stateContent = {
  pending: {
    title: 'Registration under review',
    description: 'Your hotel registration has been submitted successfully. Our Super Admin team will review your application. You will receive a notification once your registration is approved.',
    icon: Clock3,
    color: 'text-amber-700'
  },
  rejected: {
    title: 'Registration not approved',
    description: 'Your hotel registration was not approved. Please review the reason below and contact platform support if you need help.',
    icon: AlertCircle,
    color: 'text-rose-700'
  },
  suspended: {
    title: 'Hotel account suspended',
    description: 'Access to your hotel workspace has been suspended. Please contact platform support for assistance.',
    icon: ShieldAlert,
    color: 'text-rose-700'
  }
};

export const RegistrationStatus = ({ status }) => {
  const { hotel, logout } = useAuth();
  const navigate = useNavigate();
  const content = stateContent[status] || stateContent.pending;
  const Icon = content.icon;
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-xl p-8 text-center sm:p-10">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 ${content.color}`}>
          <Icon className="h-7 w-7" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Innkeeper · hotel onboarding</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">{content.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{content.description}</p>
        {status === 'rejected' && hotel?.rejectionReason && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-left text-sm text-rose-900">
            <strong>Reason provided:</strong> {hotel.rejectionReason}
          </div>
        )}
        {status === 'pending' && <p className="mt-5 text-xs text-slate-500">Submitted {hotel?.createdAt ? new Date(hotel.createdAt).toLocaleDateString() : ''}</p>}
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
          className="mt-7 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
      </Card>
    </main>
  );
};
