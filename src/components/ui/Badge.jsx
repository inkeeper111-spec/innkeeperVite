import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'sm', className = '' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    clean: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    occupied: 'bg-orvelle-cream text-orvelle-primary border-orvelle-border',
    reserved: 'bg-orvelle-cream text-orvelle-primary border-orvelle-border',
    confirmed: 'bg-orvelle-cream text-orvelle-primary border-orvelle-border',
    checked_in: 'bg-orvelle-cream text-orvelle-primary border-orvelle-border',
    checked_out: 'bg-slate-100 text-slate-600 border-slate-200',
    dirty: 'bg-amber-50 text-amber-700 border-amber-200',
    cleaning_in_progress: 'bg-orvelle-cream text-orvelle-primary border-orvelle-border',
    inspected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    unpaid: 'bg-rose-50 text-rose-700 border-rose-200',
    partially_paid: 'bg-amber-50 text-amber-700 border-amber-200',
    out_of_service: 'bg-rose-50 text-rose-700 border-rose-200',
    critical: 'bg-rose-100 text-rose-800 border-rose-300',
    high: 'bg-amber-50 text-amber-700 border-amber-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    pending_approval: 'bg-amber-50 text-amber-700 border-amber-200'
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1'
  };

  // Convert status like 'checked_in' to 'Checked In'
  const formattedText = typeof children === 'string'
    ? children.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : children;

  const style = variants[variant] || variants[children?.toString().toLowerCase()] || variants.default;

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${style} ${sizes[size]} ${className}`}>
      {formattedText}
    </span>
  );
};

