import { useEffect } from 'react';
import { useToastStore } from '../../stores/toastStore';
import type { Toast as ToastItem, ToastType } from '../../stores/toastStore';
import "../../css/Toast.css";

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
      className={`toast toast-${toast.type}`}
      role="alert"
    >
      <span className="toast-icon">{ICON[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="toast-close"
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
      className="toast-container"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
