/**
 * AdminKpiCard — Reusable KPI card for dashboards.
 *
 * Supports trend indicator, optional progress bar, and subtle loading state.
 */

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Trend {
  value: number;     // positive = up, negative = down, 0 = flat
  label?: string;    // e.g. "vs ayer"
}

interface AdminKpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: Trend;
  progress?: { pct: number };
  accent?: boolean;
}

function trendColor(val: number) {
  if (val > 0) return "text-emerald-600";
  if (val < 0) return "text-red-500";
  return "text-slate-400";
}

export default function AdminKpiCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  progress,
  accent = false,
}: AdminKpiCardProps) {
  const barColor =
    !progress
      ? ""
      : progress.pct >= 80
        ? "bg-emerald-500"
        : progress.pct >= 50
          ? "bg-amber-400"
          : "bg-red-400";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div
          className={`p-1.5 rounded-lg ${
            accent ? "bg-brand-pink/10" : "bg-slate-100"
          }`}
        >
          <Icon
            size={15}
            className={accent ? "text-brand-pink" : "text-slate-500"}
          />
        </div>
      </div>

      {/* Value */}
      <p className="font-heading font-bold text-2xl text-slate-800 leading-none">
        {value}
      </p>

      {/* Trend indicator */}
      {trend && (
        <div className="flex items-center gap-1">
          {trend.value > 0 ? (
            <TrendingUp size={12} className="text-emerald-600" />
          ) : trend.value < 0 ? (
            <TrendingDown size={12} className="text-red-500" />
          ) : (
            <Minus size={12} className="text-slate-400" />
          )}
          <span className={`text-[11px] font-medium ${trendColor(trend.value)}`}>
            {trend.value > 0 ? "+" : ""}
            {trend.value}%
          </span>
          {trend.label && (
            <span className="text-[11px] text-slate-400">{trend.label}</span>
          )}
        </div>
      )}

      {/* Progress bar */}
      {progress && (
        <div className="space-y-1">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(100, progress.pct)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            {progress.pct.toFixed(1)}% de la meta diaria
          </p>
        </div>
      )}

      {/* Subtext */}
      {sub && !trend && (
        <p className="text-[11px] text-slate-400">{sub}</p>
      )}
    </div>
  );
}
