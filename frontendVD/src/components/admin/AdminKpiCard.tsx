/**
 * AdminKpiCard — Clean editorial KPI card.
 *
 * White card with Playfair Display numbers, tiny uppercase labels,
 * optional progress bar, and trend micro-sparkline.
 * No accent borders — pure, minimal, corporate.
 */

import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

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
  up:   { icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
  down: { icon: TrendingDown, color: "text-red-600 bg-red-50" },
  flat: { icon: Minus, color: "text-slate-500 bg-slate-100" },
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
      <svg width={w} height={h} className="shrink-0" aria-hidden>
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
    <div
      className={cn(
        "bg-white border border-slate-100",
        "rounded-2xl",
        "p-6 lg:p-8",
        "shadow-card transition-shadow duration-300",
        "flex flex-col items-center text-center justify-between min-h-[140px]",
        "hover:shadow-md",
        className,
      )}
    >
      <div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-medium mb-3">
          {label}
        </p>

        <p
          className={cn(
            "font-display font-light tracking-tight text-slate-900 leading-none",
            "text-4xl",
          )}
        >
          {splitValue ? (
            <>
              <sup className="text-[38%] align-super font-normal text-slate-400 mr-0.5">
                {splitValue.symbol}
              </sup>
              {splitValue.pesos}
              {splitValue.cents && (
                <span className="text-slate-300 text-[55%] font-light">
                  {splitValue.cents}
                </span>
              )}
            </>
          ) : (
            value
          )}
        </p>
      </div>

      {(subtitle ?? trend !== undefined) && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {subtitle && (
            <p className="text-[11px] sm:text-[12px] text-slate-400 truncate">
              {subtitle}
            </p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1">
              {sparkline}
              {(() => {
                const T = TREND_CONFIG[trend];
                return (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                      T.color,
                    )}
                  >
                    <T.icon size={10} />
                    {trendPct !== undefined ? `${trendPct}%` : null}
                  </span>
                );
              })()}
              {trendLabel && (
                <span className="text-[10px] text-slate-400">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
      )}

      {progress !== undefined && (
        <div className="mt-4">
          <div className="rounded-full bg-slate-100 overflow-hidden h-1.5">
            <div
              className="h-full bg-gradient-to-r from-brand-pink to-brand-pink-dark rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          {progressLabel && (
            <p className="text-[10px] text-slate-400 mt-1">{progressLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}
