'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

const configs: Record<ToastType, { icon: React.ReactNode; color: string; bg: string }> = {
  success: { icon: <CheckCircle2 size={15} />, color: 'var(--zx-success)', bg: 'var(--zx-success-muted)' },
  error:   { icon: <XCircle size={15} />,      color: 'var(--zx-danger)',  bg: 'var(--zx-danger-muted)' },
  warning: { icon: <AlertCircle size={15} />,  color: 'var(--zx-warning)', bg: 'var(--zx-warning-muted)' },
  info:    { icon: <Info size={15} />,          color: 'var(--zx-info)',    bg: 'var(--zx-info-muted)' },
};

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const cfg = configs[toast.type];
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 3500);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl animate-fade-in-up min-w-64 max-w-sm"
      style={{ background: 'var(--zx-surface-3)', border: `1px solid ${cfg.color}40` }}>
      <span style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>
      <p className="flex-1 text-xs" style={{ color: 'var(--zx-text-1)' }}>{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} style={{ color: 'var(--zx-text-3)', flexShrink: 0 }}>
        <X size={12} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  );
}

// Hook
import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, message }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  return { toasts, toast, dismiss };
}
