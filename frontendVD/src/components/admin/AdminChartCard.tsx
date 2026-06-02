/**
 * AdminChartCard — Premium glass KPI card with optional embedded chart.
 *
 * Variants:
 *   - "kpi"      → big number + trend indicator + subtitle
 *   - "sparkline" → kpi + inline sparkline chart
 *   - "chart"     → larger card with embedded Recharts chart
 */

import { cn } from "../../utils/cn";

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

const ACCENT_COLORS = {
  pink:  { bg: "from-pink-500/10 to-rose-500/5", icon: "bg-pink-100 text-pink-600", ring: "ring-pink-200/50" },
  blue:  { bg: "from-blue-500/10 to-indigo-500/5", icon: "bg-blue-100 text-blue-600", ring: "ring-blue-200/50" },
  gold:  { bg: "from-amber-400/10 to-yellow-500/5", icon: "bg-amber-100 text-amber-600", ring: "ring-amber-200/50" },
  green: { bg: "from-emerald-500/10 to-green-500/5", icon: "bg-emerald-100 text-emerald-600", ring: "ring-emerald-200/50" },
  purple:{ bg: "from-violet-500/10 to-purple-500/5", icon: "bg-violet-100 text-violet-600", ring: "ring-violet-200/50" },
} as const;

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
  const colors = ACCENT_COLORS[accent];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br backdrop-blur-sm shadow-glass hover:shadow-glass-hover transition-all duration-300",
        colors.bg,
        variant === "chart" ? "p-6" : "p-5",
        className,
      )}
    >
      {variant === "chart" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-slate-500">{label}</p>
              <p className="text-2xl font-heading font-bold text-slate-800 mt-0.5">{value}</p>
            </div>
            {Icon && (
              <div className={cn("p-2.5 rounded-xl", colors.icon, colors.ring, "ring-1")}>
                <Icon size={20} />
              </div>
            )}
          </div>
          {children && <div className="w-full min-h-[200px]">{children}</div>}
          {subtitle && <p className="text-[12px] text-slate-400">{subtitle}</p>}
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-slate-500 tracking-wide uppercase">{label}</p>
            <p className="text-2xl font-heading font-bold text-slate-800 mt-1 truncate">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-1.5">
                <span
                  className={cn(
                    "text-[12px] font-semibold px-1.5 py-0.5 rounded-full",
                    trend.positive ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50",
                  )}
                >
                  {trend.positive ? "+" : ""}{trend.value}%
                </span>
                {trend.label && <span className="text-[12px] text-slate-400">{trend.label}</span>}
              </div>
            )}
            {subtitle && <p className="text-[12px] text-slate-400 mt-1">{subtitle}</p>}
          </div>
          {Icon && (
            <div className={cn("p-2.5 rounded-xl shrink-0", colors.icon, colors.ring, "ring-1")}>
              <Icon size={20} />
            </div>
          )}
        </div>
      )}
      {variant === "sparkline" && children && (
        <div className="mt-3 w-full h-10">{children}</div>
      )}
    </div>
  );
}

export default AdminChartCard;
