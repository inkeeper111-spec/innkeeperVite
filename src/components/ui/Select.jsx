import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

const collectOptions = (children, options) => {
  if (options?.length) return options.map((opt) => ({
    value: String(opt.value),
    label: opt.label,
    group: opt.group || '',
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
  searchable = false,
  searchPlaceholder = 'Search options...',
  size = 'md',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}) => {
  const reactId = useId();
  const selectId = id || name || reactId;
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuStyle, setMenuStyle] = useState({});

  const items = useMemo(() => collectOptions(children, options), [children, options]);
  const filteredItems = useMemo(() => {
    if (!searchable || !query.trim()) return items;
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return items.filter((item) => String(item.label).toLocaleLowerCase().includes(normalizedQuery));
  }, [items, query, searchable]);
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
      left: Math.max(12, Math.min(rect.left, window.innerWidth - Math.min(Math.max(rect.width, 176), window.innerWidth - 24) - 12)),
      width: Math.min(Math.max(rect.width, 176), window.innerWidth - 24),
      maxWidth: window.innerWidth - 24,
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
          id={`${selectId}-native`}
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
          id={selectId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          onClick={() => {
            if (disabled) return;
            setQuery('');
            setOpen((prev) => !prev);
          }}
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
          style={menuStyle}
          className="premium-select-menu overflow-hidden rounded-xl border border-orvelle-border bg-white shadow-[0_18px_50px_rgba(59,36,26,0.18)]"
        >
          {searchable && (
            <div className="sticky top-0 border-b border-orvelle-border bg-white p-2">
              <div className="flex items-center gap-2 rounded-lg border border-orvelle-border px-2.5 focus-within:border-orvelle-champagne focus-within:ring-2 focus-within:ring-orvelle-champagne/20">
                <Search className="h-4 w-4 flex-shrink-0 text-orvelle-muted" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  autoFocus
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full border-0 bg-transparent py-2 text-sm text-orvelle-text outline-none placeholder:text-orvelle-muted"
                />
              </div>
            </div>
          )}
          <div role="listbox" className="max-h-64 overflow-y-auto py-1.5">
            {filteredItems.map((item, index) => {
              const isActive = String(item.value) === String(value ?? '');
              const previous = filteredItems[index - 1];
              return (
                <React.Fragment key={item.value}>
                  {item.group && item.group !== previous?.group && (
                    <p className="px-3.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-orvelle-muted">
                      {item.group}
                    </p>
                  )}
                  <button
                    type="button"
                    role="option"
                    disabled={item.disabled}
                    aria-selected={isActive}
                    onClick={() => {
                      if (item.disabled) return;
                      emitChange(item.value);
                      setOpen(false);
                      setQuery('');
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
                </React.Fragment>
              );
            })}
            {filteredItems.length === 0 && (
              <p className="px-3.5 py-3 text-sm text-orvelle-muted">No matching options.</p>
            )}
          </div>
        </div>,
        document.body
      )}

      {error && <p className="mt-1.5 text-xs text-rose-500">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};
