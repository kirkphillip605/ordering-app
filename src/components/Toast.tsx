import React, { useState, useEffect, useCallback } from 'react';

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  exiting?: boolean;
}

let toastId = 0;
let globalAddToast: ((message: string, type?: 'success' | 'error' | 'info') => void) | null = null;

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  if (globalAddToast) globalAddToast(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, 3000);
  }, []);

  useEffect(() => {
    globalAddToast = addToast;
    return () => { globalAddToast = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  const iconMap = {
    success: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  };

  const colorMap = {
    success: 'bg-teal-500/12 border-teal-500/25 text-teal-300',
    error: 'bg-rose-500/12 border-rose-500/25 text-rose-300',
    info: 'bg-sky-500/12 border-sky-500/25 text-sky-300',
  };

  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '340px' }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${toast.exiting ? 'toast-exit' : 'toast-enter'} ${colorMap[toast.type]} pointer-events-auto px-4 py-3 rounded-xl border backdrop-blur-xl flex items-center gap-2.5 shadow-2xl text-sm font-medium`}
        >
          {iconMap[toast.type]}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
