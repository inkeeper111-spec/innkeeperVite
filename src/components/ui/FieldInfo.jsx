import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export const FieldInfo = ({ text, label }) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const popupRef = useRef(null);
  const popupId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(288, window.innerWidth - 24);
      const top = window.innerHeight - rect.bottom < 150 && rect.top > 150
        ? Math.max(12, rect.top - 140)
        : rect.bottom + 6;
      setPosition({
        top,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        width
      });
    };
    const closeOnOutsideClick = (event) => {
      if (buttonRef.current?.contains(event.target) || popupRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('mousedown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('mousedown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label ? `Information about ${label}` : 'Show field information'}
        aria-expanded={open}
        aria-controls={popupId}
        title="Show field information"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-orvelle-muted hover:bg-orvelle-ivory hover:text-orvelle-primary focus:outline-none focus:ring-2 focus:ring-orvelle-champagne"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && position && createPortal(
        <div
          ref={popupRef}
          id={popupId}
          role="tooltip"
          style={{ position: 'fixed', top: position.top, left: position.left, width: position.width, zIndex: 100 }}
          className="rounded-lg border border-orvelle-border bg-white p-2.5 text-left text-xs font-normal normal-case leading-relaxed text-orvelle-text shadow-lg"
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
};
