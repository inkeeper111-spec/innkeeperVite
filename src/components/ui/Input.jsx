import React, { useId } from 'react';
import { DatePicker } from './DatePicker';
import { MonthPicker } from './MonthPicker';
import { FieldInfo } from './FieldInfo';

export const Input = ({
  label,
  error,
  helperText,
  info,
  className = '',
  id,
  required,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || props.name || generatedId;

  if (props.type === 'date') {
    return (
      <DatePicker
        {...props}
        id={inputId}
        label={label}
        required={required}
        error={error}
        helperText={helperText}
        info={info}
        className={className}
      />
    );
  }

  if (props.type === 'month') {
    return (
      <MonthPicker
        {...props}
        id={inputId}
        label={label}
        required={required}
        error={error}
        helperText={helperText}
        info={info}
        className={className}
      />
    );
  }

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex min-h-8 items-start justify-between gap-2">
          <label htmlFor={inputId} className="min-w-0 flex-1 text-xs font-semibold leading-4 text-orvelle-primary uppercase tracking-wider">
            {label} {required && <span className="text-orvelle-error">*</span>}
          </label>
          {info && <FieldInfo text={info} label={label} />}
        </div>
      )}
      <input
        id={inputId}
        required={required}
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
