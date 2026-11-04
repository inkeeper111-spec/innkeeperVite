import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const parseMonth = (value) => {
  const match = /^(\d{4})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year, month } : null;
};

const formatMonth = (value) => {
  const month = parseMonth(value);
  return month
    ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
      .format(new Date(month.year, month.month - 1, 1))
    : '';
};

export const MonthPicker = ({
  value = '',
  onChange,
  min,
  max,
  placeholder = 'Select month',
  label,
  required,
  error,
  helperText,
  disabled,
  className = '',
  id,
  name
}) => {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  const selectedMonth = parseMonth(value);
  const minimumMonth = parseMonth(min);
  const maximumMonth = parseMonth(max);
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [visibleYear, setVisibleYear] = useState(selectedMonth?.year || currentYear);
  const [popupStyle, setPopupStyle] = useState(null);

  useEffect(() => {
    if (selectedMonth) setVisibleYear(selectedMonth.year);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const positionPopup = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(296, window.innerWidth - 16);
      const height = popupRef.current?.offsetHeight || 300;
      const margin = 8;
      const openUpward = window.innerHeight - rect.bottom < height + margin
        && rect.top > window.innerHeight - rect.bottom;
      setPopupStyle({
        position: 'fixed',
        top: openUpward ? undefined : Math.min(rect.bottom + margin, window.innerHeight - height - margin),
        bottom: openUpward ? window.innerHeight - rect.top + margin : undefined,
        left: Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin),
        width,
        zIndex: 80
      });
    };
    positionPopup();
    window.addEventListener('resize', positionPopup);
    window.addEventListener('scroll', positionPopup, true);
    const closeOnOutsideClick = (event) => {
      if (rootRef.current?.contains(event.target) || popupRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('resize', positionPopup);
      window.removeEventListener('scroll', positionPopup, true);
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const isDisabled = (monthNumber) => {
    const candidate = visibleYear * 100 + monthNumber;
    return disabled
      || (minimumMonth && candidate < minimumMonth.year * 100 + minimumMonth.month)
      || (maximumMonth && candidate > maximumMonth.year * 100 + maximumMonth.month);
  };

  const selectMonth = (monthNumber) => {
    if (isDisabled(monthNumber)) return;
    onChange?.({
      target: { name, value: `${visibleYear}-${String(monthNumber).padStart(2, '0')}` }
    });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-orvelle-primary">
          {label} {required && <span className="text-orvelle-error">*</span>}
        </label>
      )}
      <input type="hidden" name={name} value={value || ''} readOnly required={required} />
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? `${label}: ${formatMonth(value) || placeholder}` : placeholder}
        aria-required={required || undefined}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center gap-3 rounded-lg border bg-white px-3.5 py-2.5 text-left text-sm transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 ${
          open
            ? 'border-orvelle-champagne ring-2 ring-orvelle-champagne/30'
            : error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-300 hover:border-orvelle-champagne/70'
        }`}
      >
        <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-md ${
          open ? 'bg-orvelle-champagne/20 text-orvelle-primary' : 'bg-slate-100 text-slate-500'
        }`}>
          <CalendarDays className="h-4 w-4" />
        </span>
        <span className={`min-w-0 flex-1 truncate ${value ? 'font-medium text-orvelle-text' : 'text-orvelle-muted'}`}>
          {formatMonth(value) || placeholder}
        </span>
        <ChevronRight className={`h-4 w-4 flex-none text-orvelle-champagne transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && createPortal(
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Choose month"
          style={popupStyle || { top: 0, left: 0, width: 296, visibility: 'hidden' }}
          className="rounded-2xl border border-orvelle-border bg-white p-3 shadow-[0_18px_55px_rgba(48,35,29,0.18)]"
        >
          <div className="mb-3 flex items-center justify-between rounded-xl bg-orvelle-primary px-2 py-2 text-white">
            <button
              type="button"
              aria-label="Previous year"
              disabled={minimumMonth && visibleYear <= minimumMonth.year}
              onClick={() => setVisibleYear((year) => year - 1)}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold">{visibleYear}</span>
            <button
              type="button"
              aria-label="Next year"
              disabled={maximumMonth && visibleYear >= maximumMonth.year}
              onClick={() => setVisibleYear((year) => year + 1)}
              className="rounded-lg p-1.5 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((month, index) => {
              const monthNumber = index + 1;
              const selected = selectedMonth?.year === visibleYear && selectedMonth.month === monthNumber;
              const current = currentYear === visibleYear && new Date().getMonth() === index;
              return (
                <button
                  key={month}
                  type="button"
                  disabled={isDisabled(monthNumber)}
                  aria-pressed={selected}
                  onClick={() => selectMonth(monthNumber)}
                  className={`rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:text-slate-300 ${
                    selected
                      ? 'bg-orvelle-primary text-white shadow-md shadow-orvelle-primary/20'
                      : current
                        ? 'border border-orvelle-champagne text-orvelle-primary'
                        : 'text-slate-700 hover:bg-orvelle-cream'
                  }`}
                >
                  {month.slice(0, 3)}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between border-t border-orvelle-border/70 pt-2">
            {value ? (
              <button
                type="button"
                onClick={() => {
                  onChange?.({ target: { name, value: '' } });
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-orvelle-cream hover:text-rose-600"
              >
                Clear
              </button>
            ) : <span />}
            <button
              type="button"
              onClick={() => {
                const monthNumber = new Date().getMonth() + 1;
                const selectedYearMonth = currentYear * 100 + monthNumber;
                if (
                  (minimumMonth && selectedYearMonth < minimumMonth.year * 100 + minimumMonth.month)
                  || (maximumMonth && selectedYearMonth > maximumMonth.year * 100 + maximumMonth.month)
                ) return;
                setVisibleYear(currentYear);
                onChange?.({
                  target: { name, value: `${currentYear}-${String(monthNumber).padStart(2, '0')}` }
                });
                setOpen(false);
              }}
              className="rounded-md px-2 py-1 text-xs font-semibold text-orvelle-primary hover:bg-orvelle-cream"
            >
              This month
            </button>
          </div>
        </div>,
        document.body
      )}
      {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
      {!error && helperText && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};
