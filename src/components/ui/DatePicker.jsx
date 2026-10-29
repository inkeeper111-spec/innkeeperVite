import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const pad = (value) => String(value).padStart(2, '0');

const toIsoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return toIsoDate(date) === value ? date : null;
};

const addMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1);

const formatDisplayDate = (value) => {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

export const DatePicker = ({
  value = '',
  onChange,
  min,
  max,
  placeholder = 'Select date',
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
  const inputRef = useRef(null);
  const popupRef = useRef(null);
  const selectedDate = parseDate(value);
  const minimumDate = parseDate(min);
  const maximumDate = parseDate(max);
  const initialMonth = selectedDate || minimumDate || new Date();
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState(null);
  const [visibleMonth, setVisibleMonth] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  const openRef = useRef(false);
  openRef.current = open;

  useEffect(() => {
    const nextDate = parseDate(value);
    if (nextDate) setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const placePopup = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(296, window.innerWidth - 16);
      const height = popupRef.current?.offsetHeight || 340;
      const margin = 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < height + margin && rect.top > spaceBelow;
      const left = Math.min(Math.max(margin, rect.left), Math.max(margin, window.innerWidth - width - margin));
      const top = openUpward
        ? Math.max(margin, rect.top - height - margin)
        : Math.min(rect.bottom + margin, Math.max(margin, window.innerHeight - height - margin));
      setPopupStyle({ top, left, width });
    };
    placePopup();
    const frame = window.requestAnimationFrame(placePopup);
    window.addEventListener('resize', placePopup);
    window.addEventListener('scroll', placePopup, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', placePopup);
      window.removeEventListener('scroll', placePopup, true);
    };
  }, [open, visibleMonth, value]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || !openRef.current) return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const emitChange = (nextValue) => {
    onChange?.({ target: { name, value: nextValue } });
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [visibleMonth]);

  const isDisabled = (date) => (
    disabled
    || (minimumDate && date < new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate()))
    || (maximumDate && date > new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate()))
  );

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth);

  return (
    <div ref={rootRef} className="relative w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-orvelle-primary uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-orvelle-error">*</span>}
        </label>
      )}
      <input type="hidden" name={name} value={value || ''} readOnly required={required} />
      <button
        ref={inputRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? `${label}: ${formatDisplayDate(value) || placeholder}` : undefined}
        aria-required={required || undefined}
        onClick={() => setOpen((current) => !current)}
        className={`group flex w-full items-center gap-3 rounded-lg border bg-white px-3.5 py-2.5 text-left text-sm transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 ${
          open
            ? 'border-orvelle-champagne ring-2 ring-orvelle-champagne/30'
            : error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-300 hover:border-orvelle-champagne/70'
        } ${className}`}
      >
        <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-md ${open ? 'bg-orvelle-champagne/20 text-orvelle-primary' : 'bg-slate-100 text-slate-500 group-hover:bg-orvelle-champagne/10 group-hover:text-orvelle-primary'}`}>
          <CalendarDays className="h-4 w-4" />
        </span>
        <span className={value ? 'text-orvelle-text font-medium' : 'text-orvelle-muted'}>
          {formatDisplayDate(value) || placeholder}
        </span>
      </button>

      {open && createPortal(
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Choose date"
          style={popupStyle || { top: 0, left: 0, width: 296, visibility: 'hidden' }}
          className="fixed z-[80] origin-top rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_55px_rgba(48,35,29,0.18)] animate-toast-enter"
        >
          <div className="mb-2 flex items-center justify-between rounded-xl bg-orvelle-primary px-2 py-2 text-white">
            <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth((current) => addMonths(current, -1))} className="rounded-lg p-1.5 transition-colors hover:bg-white/10">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold">{monthLabel}</span>
            <button type="button" aria-label="Next month" onClick={() => setVisibleMonth((current) => addMonths(current, 1))} className="rounded-lg p-1.5 transition-colors hover:bg-white/10">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <span key={day} className="py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{day}</span>
            ))}
            {calendarDays.map((date) => {
              const isoDate = toIsoDate(date);
              const inMonth = date.getMonth() === visibleMonth.getMonth();
              const isSelected = isoDate === value;
              const isToday = isoDate === toIsoDate(new Date());
              return (
                <button
                  key={isoDate}
                  type="button"
                  disabled={isDisabled(date)}
                  onClick={() => {
                    emitChange(isoDate);
                    setOpen(false);
                    inputRef.current?.focus();
                  }}
                  className={`h-8 rounded-lg text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:text-slate-300 ${
                    isSelected
                      ? 'bg-orvelle-primary text-white shadow-md shadow-orvelle-primary/20'
                      : isToday
                        ? 'border border-orvelle-champagne text-orvelle-primary'
                        : inMonth
                          ? 'text-slate-700 hover:bg-orvelle-champagne/20'
                          : 'text-slate-300 hover:bg-slate-50'
                  }`}
                  aria-label={new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date)}
                  aria-current={isToday ? 'date' : undefined}
                  aria-pressed={isSelected}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          {value && (
            <button type="button" onClick={() => emitChange('')} className="mt-2 w-full rounded-lg py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-rose-600">
              Clear date
            </button>
          )}
        </div>,
        document.body
      )}
      {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
      {!error && helperText && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};
