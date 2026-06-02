import { useEffect } from 'react';
import { useToastStore } from '../../stores/toastStore';
import type { Toast as ToastItem, ToastType } from '../../stores/toastStore';
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';

const ICON: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const BG_COLOR: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error:   'border-red-200 bg-red-50 text-red-800',
  info:    'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const IconComp = ICON[toast.type];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border rounded-xl shadow-lg animate-slideUp backdrop-blur-sm ${BG_COLOR[toast.type]}`}
      role="alert"
    >
      <IconComp size={18} className="shrink-0" />
      <span className="text-[13px] font-medium flex-1">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Cerrar"
      >
        <XCircle size={16} />
      </button>
      <div
        className="absolute bottom-0 left-0 h-0.5 rounded-full bg-current opacity-20 animate-[shrinkWidth_3.5s_linear_forwards]"
        style={{ width: '100%' }}
      />
    </div>
  );
}

export function Toast() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2 w-full max-w-sm"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div key={t.id} className="relative animate-slideUp">
          <ToastCard toast={t} />
        </div>
      ))}
    </div>
  );
}
