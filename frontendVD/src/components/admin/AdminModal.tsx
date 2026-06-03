/**
 * AdminModal — Reusable modal with backdrop animation, Esc close, and focus management.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import "../../css/AdminModal.css";

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function AdminModal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: AdminModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open && panelRef.current) {
      const firstFocusable = panelRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="admin-modal-backdrop" onClick={onClose} />
      <div ref={panelRef} className={cn("admin-modal-panel", `admin-modal-panel--${size}`)}>
        <div className="admin-modal-header">
          <h2 id="modal-title" className="admin-modal-title">{title}</h2>
          <button onClick={onClose} className="admin-modal-close" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  );
}
