/**
 * AdminEmptyState — Empty state placeholder with icon, message, and optional CTA.
 * Supports error variant for API failures.
 */

import { Plus, RotateCw } from "lucide-react";

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

const COLOR = {
  default: {
    bg: "bg-slate-100",
    icon: "text-slate-400",
    title: "text-slate-700",
    desc: "text-slate-500",
  },
  error: {
    bg: "bg-red-50",
    icon: "text-red-400",
    title: "text-red-700",
    desc: "text-red-500",
  },
} as const;

export default function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  onRetry,
}: AdminEmptyStateProps) {
  const c = COLOR[variant];
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center mb-4`}>
        <Icon size={24} className={c.icon} />
      </div>
      <h3 className={`font-heading font-semibold ${c.title} text-base`}>
        {title}
      </h3>
      {description && (
        <p className={`text-[13px] ${c.desc} mt-1 max-w-sm`}>
          {description}
        </p>
      )}
      <div className="flex items-center gap-2 mt-4">
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-pink text-white text-[13px] font-semibold rounded-lg hover:bg-brand-pink/90 transition-colors"
          >
            <Plus size={15} />
            {action.label}
          </button>
        )}
        {variant === "error" && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-700 text-[13px] font-medium rounded-lg hover:bg-red-50 transition-colors"
          >
            <RotateCw size={15} />
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
