/**
 * AdminPageHeader — Consistent page title with optional action button.
 *
 * Usage:
 *   <AdminPageHeader
 *     title="Pedidos"
 *     description="Gestiona y actualiza el estado de los pedidos"
 *     action={{ label: "Exportar CSV", icon: Download, onClick: handleExport }}
 *   />
 */

import type { ReactNode } from "react";

interface Action {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  loading?: boolean;
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: Action;
  children?: ReactNode;
}

export default function AdminPageHeader({
  title,
  description,
  action,
  children,
}: AdminPageHeaderProps) {
  const ActionIcon = action?.icon;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className="font-heading font-bold text-xl text-slate-800">
          {title}
        </h1>
        {description && (
          <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {children}
        {action && (
          <button
            onClick={action.onClick}
            disabled={action.loading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-pink text-white text-[13px] font-semibold rounded-lg hover:bg-brand-pink/90 transition-colors disabled:opacity-60"
          >
            {action.loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : ActionIcon ? (
              <ActionIcon size={15} />
            ) : null}
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
