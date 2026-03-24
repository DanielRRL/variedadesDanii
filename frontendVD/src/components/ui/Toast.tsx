import { useEffect } from 'react';
import { useToastStore } from '../../stores/toastStore';
import type { Toast as ToastItem, ToastType } from '../../stores/toastStore';

const BG: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
  warning: 'bg-orange-500',
};

const ICON: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

function ToastItem({ toast }: { toast: ToastItem }) {
  const { removeToast } = useToastStore();

  useEffect(() => {
    return () => {};
  }, []);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm min-w-64 max-w-xs ${BG[toast.type]}`}
      role="alert"
    >
      <span className="font-bold text-base leading-none mt-0.5">{ICON[toast.type]}</span>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="opacity-70 hover:opacity-100 text-lg leading-none shrink-0"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}

export function Toast() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 sm:flex-col items-end"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
