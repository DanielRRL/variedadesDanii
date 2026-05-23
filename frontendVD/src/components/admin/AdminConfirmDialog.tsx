/**
 * AdminConfirmDialog — Branded confirmation dialog for destructive actions.
 *
 * Replaces window.confirm() with a consistent modal.
 *
 * Usage:
 *   <AdminConfirmDialog
 *     open={showConfirm}
 *     onClose={() => setShowConfirm(false)}
 *     onConfirm={handleDelete}
 *     title="Eliminar producto"
 *     message="¿Estás seguro? Esta acción no se puede deshacer."
 *     confirmLabel="Eliminar"
 *     variant="danger"
 *     loading={isDeleting}
 *   />
 */

import { AlertTriangle } from "lucide-react";

interface AdminConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
}

export default function AdminConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  variant = "danger",
  loading = false,
}: AdminConfirmDialogProps) {
  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 animate-fadeIn"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md animate-fadeIn">
        <div className="p-6 text-center">
          <div
            className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
              isDanger ? "bg-red-100" : "bg-amber-100"
            }`}
          >
            <AlertTriangle
              size={22}
              className={isDanger ? "text-red-600" : "text-amber-600"}
            />
          </div>
          <h3 className="font-heading font-semibold text-slate-800 text-base mb-1">
            {title}
          </h3>
          <p className="text-[13px] text-slate-500">{message}</p>
        </div>
        <div className="px-6 pb-6 flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-[13px] font-semibold text-white rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
