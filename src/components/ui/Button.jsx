import React from 'react';
import { NestnnLogo } from './NestnnLogo';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500 shadow-sm',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-300',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700 focus:ring-brand-500',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
    gold: 'bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-400 shadow-sm',
    ghost: 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="relative grid h-5 w-5 shrink-0 place-items-center" role="status" aria-label="Loading">
          <span className="absolute inset-0 rounded-full border-2 border-current/30 border-t-current animate-spin" />
          <NestnnLogo variant="icon" size="xs" className="!h-3 !w-3 !rounded-full !bg-transparent !p-0" />
        </span>
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
};
