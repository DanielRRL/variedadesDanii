/**
 * AdminEmptyState — Empty state placeholder with icon, message, and optional CTA.
 */

import { Plus, RotateCw } from "lucide-react";
import { cn } from "../../utils/cn";
import "../../css/AdminEmptyState.css";

interface ActionCTA {
  label: string;
  onClick: () => void;
}

interface AdminEmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: ActionCTA;
  variant?: "default" | "error";
  onRetry?: () => void;
}

export default function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  onRetry,
}: AdminEmptyStateProps) {
  return (
    <div className="admin-empty-state">
      <div className={cn("admin-empty-state__icon-wrap", `admin-empty-state__icon-wrap--${variant}`)}>
        <Icon size={24} />
      </div>
      <h3 className={cn("admin-empty-state__title", `admin-empty-state__title--${variant}`)}>{title}</h3>
      {description && (
        <p className={cn("admin-empty-state__desc", `admin-empty-state__desc--${variant}`)}>{description}</p>
      )}
      <div className="admin-empty-state__actions">
        {action && (
          <button onClick={action.onClick} className="admin-empty-state__cta">
            <Plus size={15} />
            {action.label}
          </button>
        )}
        {variant === "error" && onRetry && (
          <button onClick={onRetry} className="admin-empty-state__retry">
            <RotateCw size={15} />
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
