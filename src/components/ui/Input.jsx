import React from 'react';

export const Input = ({
  label,
  error,
  helperText,
  className = '',
  id,
  required,
  ...props
}) => {
  const inputId = id || props.name || Math.random().toString(36).substring(7);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-orvelle-primary uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-orvelle-error">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-orvelle-text placeholder:text-orvelle-muted focus:outline-none focus:ring-2 focus:ring-orvelle-champagne/30 focus:border-orvelle-champagne transition-all ${
          error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};

