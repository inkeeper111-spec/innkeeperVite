import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

const ToastContext = createContext(null);
export const TOAST_DURATION_MS = 7000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const recentMessages = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.map((toast) => (
      toast.id === id ? { ...toast, leaving: true } : toast
    )));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 180);
  }, []);

  const showToast = useCallback((type, message, key) => {
    const normalizedMessage = String(message || '').trim();
    if (!normalizedMessage) return;

    const dedupeKey = key || `${type}:${normalizedMessage}`;
    const now = Date.now();
    const previous = recentMessages.current.get(dedupeKey);
    if (previous && now - previous < 1200) return;
    recentMessages.current.set(dedupeKey, now);

    const id = `${dedupeKey}:${now}:${Math.random()}`;
    setToasts((current) => [...current.slice(-3), { id, type, message: normalizedMessage, leaving: false }]);
    window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
  }, [dismiss]);

  useEffect(() => {
    const handleToast = (event) => {
      const { type, message, key } = event.detail || {};
      showToast(type === 'error' ? 'error' : 'success', message, key);
    };
    window.addEventListener('innkeeper:toast', handleToast);
    return () => window.removeEventListener('innkeeper:toast', handleToast);
  }, [showToast]);

  useEffect(() => {
    const cleanup = window.setInterval(() => {
      const cutoff = Date.now() - 5000;
      recentMessages.current.forEach((timestamp, key) => {
        if (timestamp < cutoff) recentMessages.current.delete(key);
      });
    }, 5000);
    return () => window.clearInterval(cleanup);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed inset-x-0 top-4 z-[9999] flex flex-col items-center gap-2 px-3 pointer-events-none"
      >
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const Icon = isError ? AlertTriangle : CheckCircle2;
          return (
            <div
              key={toast.id}
              role={isError ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-xl transition-all duration-180 ${
                toast.leaving ? 'translate-y-[-12px] opacity-0' : 'translate-y-0 opacity-100 animate-toast-enter'
              } ${isError
                ? 'border-rose-200 bg-rose-50 text-rose-950'
                : 'border-emerald-200 bg-emerald-50 text-emerald-950'
              }`}
            >
              <Icon className={`mt-0.5 h-5 w-5 flex-none ${isError ? 'text-rose-600' : 'text-emerald-600'}`} />
              <p className="min-w-0 flex-1 text-sm font-semibold leading-5">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-0.5 text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
