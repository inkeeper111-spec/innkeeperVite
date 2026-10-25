import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

const collectOptions = (children, options) => {
  if (options?.length) return options.map((opt) => ({
    value: String(opt.value),
    label: opt.label,
    disabled: Boolean(opt.disabled)
  }));

  const parsed = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === 'optgroup') {
      React.Children.forEach(child.props.children, (nested) => {
        if (!React.isValidElement(nested) || nested.type !== 'option') return;
        parsed.push({
          value: String(nested.props.value ?? ''),
          label: nested.props.children,
          disabled: Boolean(nested.props.disabled)
        });
      });
      return;
    }
    if (child.type === 'option') {
      parsed.push({
        value: String(child.props.value ?? ''),
        label: child.props.children,
        disabled: Boolean(child.props.disabled)
      });
    }
  });
  return parsed;
};

export const Select = ({
  label,
  options = [],
  error,
  helperText,
  className = '',
  id,
  required,
  children,
  value,
  onChange,
  name,
  disabled = false,
  placeholder,
  size = 'md',
  ...props
}) => {
  const reactId = useId();
  const selectId = id || name || reactId;
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});

  const items = useMemo(() => collectOptions(children, options), [children, options]);
  const selected = items.find((item) => String(item.value) === String(value ?? ''));
  const displayLabel = selected?.label ?? placeholder ?? 'Select';

  const emitChange = (nextValue) => {
    if (!onChange) return;
    onChange({
      target: { name, value: nextValue },
      currentTarget: { name, value: nextValue }
    });
  };

  const updateMenuPosition = () => {
    const trigger = buttonRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuHeight = Math.min(items.length * 40 + 16, 280);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
    setMenuStyle({
      position: 'fixed',
      top: openUp ? undefined : rect.bottom + 6,
      bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
      left: rect.left,
      width: Math.max(rect.width, 176),
      zIndex: 80
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();
    const close = (event) => {
      if (
        rootRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) return;
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, items.length]);

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs rounded-lg'
    : 'px-3.5 py-2.5 text-sm rounded-xl';

  return (
    <div className={`w-full ${className}`} ref={rootRef}>
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-orvelle-primary uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-orvelle-error">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value ?? ''}
          required={required}
          disabled={disabled}
          onChange={onChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          {...props}
        >
          {items.map((item) => (
            <option key={item.value} value={item.value} disabled={item.disabled}>
              {item.label}
            </option>
          ))}
        </select>

        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={`premium-select-trigger w-full ${sizeClasses} bg-white border text-left text-orvelle-text flex items-center justify-between gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all ${
            error
              ? 'border-rose-400 focus:border-rose-500'
              : open
                ? 'border-orvelle-champagne ring-2 ring-orvelle-champagne/25'
                : 'border-orvelle-border hover:border-orvelle-champagne/70'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-orvelle-ivory' : 'cursor-pointer'}`}
        >
          <span className={`truncate font-medium ${!selected?.value && selected?.value !== 0 ? 'text-orvelle-muted' : ''}`}>
            {displayLabel}
          </span>
          <ChevronDown className={`w-4 h-4 flex-shrink-0 text-orvelle-champagne transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={menuStyle}
          className="premium-select-menu overflow-hidden rounded-xl border border-orvelle-border bg-white shadow-[0_18px_50px_rgba(59,36,26,0.18)]"
        >
          <div className="max-h-64 overflow-y-auto py-1.5">
            {items.map((item) => {
              const isActive = String(item.value) === String(value ?? '');
              return (
                <button
                  key={item.value}
                  type="button"
                  role="option"
                  disabled={item.disabled}
                  aria-selected={isActive}
                  onClick={() => {
                    if (item.disabled) return;
                    emitChange(item.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between gap-3 transition-colors ${
                    isActive
                      ? 'bg-orvelle-ivory text-orvelle-primary font-semibold'
                      : 'text-orvelle-text hover:bg-orvelle-cream'
                  } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <span className="truncate">{item.label}</span>
                  {isActive && <Check className="w-4 h-4 text-orvelle-champagne flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};
