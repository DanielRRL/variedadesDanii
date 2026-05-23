/**
 * AdminEmptyState — Empty state placeholder with icon, message, and optional CTA.
 *
 * Usage:
 *   <AdminEmptyState
 *     icon={Package}
 *     title="No hay productos"
 *     description="Crea tu primer producto para empezar."
 *     action={{ label: "Crear producto", onClick: () => setShowModal(true) }}
 *   />
 */

import { Plus } from "lucide-react";

interface ActionCTA {
  label: string;
  onClick: () => void;
}

interface AdminEmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: ActionCTA;
}

export default function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon size={24} className="text-slate-400" />
      </div>
      <h3 className="font-heading font-semibold text-slate-700 text-base">
        {title}
      </h3>
      {description && (
        <p className="text-[13px] text-slate-500 mt-1 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-pink text-white text-[13px] font-semibold rounded-lg hover:bg-brand-pink/90 transition-colors"
        >
          <Plus size={15} />
          {action.label}
        </button>
      )}
    </div>
  );
}
