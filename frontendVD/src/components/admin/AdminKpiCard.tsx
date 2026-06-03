/**
 * AdminKpiCard — Clean editorial KPI card.
 */

import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import "../../css/AdminKpiCard.css";

export interface AdminKpiCardProps {
  label: string;
  value?: string | number;
  splitValue?: { symbol: string; pesos: string; cents: string };
  icon?: React.ElementType;
  trend?: "up" | "down" | "flat";
  trendPct?: number;
  trendLabel?: string;
  progress?: number;
  progressLabel?: string;
  subtitle?: string;
  className?: string;
}

const TREND_CONFIG = {
  up:   { icon: TrendingUp, color: "admin-kpi-card__trend-badge--up" },
  down: { icon: TrendingDown, color: "admin-kpi-card__trend-badge--down" },
  flat: { icon: Minus, color: "admin-kpi-card__trend-badge--flat" },
} as const;

export default function AdminKpiCard({
  label,
  value,
  splitValue,
  trend,
  trendPct,
  trendLabel,
  progress,
  progressLabel,
  subtitle,
  className,
}: AdminKpiCardProps) {
  const sparkline = useMemo(() => {
    if (trend === undefined) return null;
    const points = trend === "up"
      ? [20, 15, 25, 18, 30]
      : trend === "down"
        ? [20, 25, 15, 22, 10]
        : [20, 22, 18, 21, 20];
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const h = 20;
    const w = 40;
    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * (w - 2) + 1;
      const y = h - 2 - ((p - min) / range) * (h - 4);
      return `${x},${y}`;
    });
    const strokeColor = trend === "up" ? "#16A34A" : trend === "down" ? "#DC2626" : "#94A3B8";
    return (
      <svg width={w} height={h} className="admin-kpi-card__sparkline" aria-hidden>
        <polyline
          points={coords.join(" ")}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }, [trend]);

  return (
    <div className={cn("admin-kpi-card", className)}>
      <div>
        <p className="admin-kpi-card__label">{label}</p>
        <p className="admin-kpi-card__value">
          {splitValue ? (
            <>
              <sup className="admin-kpi-card__sup">{splitValue.symbol}</sup>
              {splitValue.pesos}
              {splitValue.cents && (
                <span className="admin-kpi-card__cents">{splitValue.cents}</span>
              )}
            </>
          ) : (
            value
          )}
        </p>
      </div>

      {(subtitle ?? trend !== undefined) && (
        <div className="admin-kpi-card__meta">
          {subtitle && (
            <p className="admin-kpi-card__subtitle">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="admin-kpi-card__trend-wrap">
              {sparkline}
              {(() => {
                const T = TREND_CONFIG[trend];
                return (
                  <span className={cn("admin-kpi-card__trend-badge", T.color)}>
                    <T.icon size={10} />
                    {trendPct !== undefined ? `${trendPct}%` : null}
                  </span>
                );
              })()}
              {trendLabel && (
                <span className="admin-kpi-card__trend-label">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
      )}

      {progress !== undefined && (
        <div className="admin-kpi-card__progress">
          <div className="admin-kpi-card__progress-track">
            <div
              className="admin-kpi-card__progress-fill"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          {progressLabel && (
            <p className="admin-kpi-card__progress-label">{progressLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}
