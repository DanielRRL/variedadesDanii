/**
 * AdminConfirmDialog — Branded confirmation dialog for destructive actions.
 */

import { AlertTriangle } from "lucide-react";
import { cn } from "../../utils/cn";
import "../../css/AdminConfirmDialog.css";

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

  return (
    <div className="admin-confirm-overlay">
      <div className="admin-confirm-backdrop" onClick={onClose} />
      <div className="admin-confirm-body">
        <div className="admin-confirm-content">
          <div className={cn("admin-confirm-icon", `admin-confirm-icon--${variant}`)}>
            <AlertTriangle size={22} />
          </div>
          <h3 className="admin-confirm-title">{title}</h3>
          <p className="admin-confirm-message">{message}</p>
        </div>
        <div className="admin-confirm-actions">
          <button onClick={onClose} disabled={loading} className="admin-confirm-cancel">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn("admin-confirm-btn", `admin-confirm-btn--${variant}`)}
          >
            {loading && <span className="admin-confirm-spinner" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
