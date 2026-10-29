import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
  footer
}) => {
  const titleId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    const frame = window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-5">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 cursor-default bg-orvelle-dark/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative z-10 my-0 flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-orvelle-border bg-white shadow-2xl transition-all sm:my-6 sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl ${maxWidth}`}
      >
        {/* Header */}
        <div className="flex flex-none items-start justify-between gap-3 border-b border-orvelle-border/60 bg-orvelle-ivory/70 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="text-lg font-bold text-orvelle-primary break-words">{title}</h3>
            {subtitle && <p className="text-xs text-orvelle-muted mt-0.5 break-words">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 p-1.5 text-orvelle-muted hover:text-orvelle-primary hover:bg-orvelle-cream rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-none flex-wrap items-center justify-end gap-2 border-t border-orvelle-border/60 bg-orvelle-ivory px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

