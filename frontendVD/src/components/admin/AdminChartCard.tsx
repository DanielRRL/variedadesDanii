/**
 * AdminChartCard — Premium glass KPI card with optional embedded chart.
 */

import { cn } from "../../utils/cn";
import "../../css/AdminChartCard.css";

interface AdminChartCardProps {
  variant?: "kpi" | "sparkline" | "chart";
  icon?: React.ElementType;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    positive: boolean;
    label?: string;
  };
  accent?: "pink" | "blue" | "gold" | "green" | "purple";
  className?: string;
  children?: React.ReactNode;
}

export function AdminChartCard({
  variant = "kpi",
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  accent = "pink",
  className,
  children,
}: AdminChartCardProps) {
  const cardCls = cn(
    "admin-chart-card",
    `admin-chart-card--${variant}`,
    `admin-chart-card--${accent}`,
    className,
  );

  if (variant === "chart") {
    return (
      <div className={cardCls}>
        <div className="admin-chart-card__chart-body">
          <div className="admin-chart-card__kpi-layout">
            <div className="admin-chart-card__kpi-info">
              <p className="admin-chart-card__label">{label}</p>
              <p className="admin-chart-card__value">{value}</p>
            </div>
            {Icon && (
              <div className={cn("admin-chart-card__icon", `admin-chart-card__icon--${accent}`)}>
                <Icon size={20} />
              </div>
            )}
          </div>
          {children && <div className="admin-chart-card__chart-area">{children}</div>}
          {subtitle && <p className="admin-chart-card__subtitle">{subtitle}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={cardCls}>
      <div className="admin-chart-card__kpi-layout">
        <div className="admin-chart-card__kpi-info">
          <p className="admin-chart-card__label">{label}</p>
          <p className="admin-chart-card__value">{value}</p>
          {trend && (
            <div className="admin-chart-card__trend">
              <span className={cn(
                "admin-chart-card__trend-badge",
                trend.positive ? "admin-chart-card__trend-badge--up" : "admin-chart-card__trend-badge--down",
              )}>
                {trend.positive ? "+" : ""}{trend.value}%
              </span>
              {trend.label && <span className="admin-chart-card__trend-label">{trend.label}</span>}
            </div>
          )}
          {subtitle && <p className="admin-chart-card__subtitle">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn("admin-chart-card__icon", `admin-chart-card__icon--${accent}`)}>
            <Icon size={20} />
          </div>
        )}
      </div>
      {variant === "sparkline" && children && (
        <div className="admin-chart-card__chart-area">{children}</div>
      )}
    </div>
  );
}

export default AdminChartCard;
