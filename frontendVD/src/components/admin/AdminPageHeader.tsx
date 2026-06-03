/**
 * AdminPageHeader — Consistent page title with optional action button.
 */

import type { ReactNode } from "react";
import "../../css/AdminPageHeader.css";

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
    <div className="admin-page-header">
      <div className="admin-page-header__info">
        <h1 className="admin-page-header__title">{title}</h1>
        {description && (
          <p className="admin-page-header__desc">{description}</p>
        )}
      </div>

      <div className="admin-page-header__right">
        {children}
        {action && (
          <button
            onClick={action.onClick}
            disabled={action.loading}
            className="admin-page-header__action-btn"
          >
            {action.loading ? (
              <span className="admin-page-header__spinner" />
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
