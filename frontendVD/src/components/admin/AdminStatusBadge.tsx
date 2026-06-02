/**
 * AdminStatusBadge — Consistent status pill with icon support.
 *
 * Color prop maps to Tailwind background/text pairs.
 */

import type { ReactNode } from "react";

type BadgeColor =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

const COLOR_CLASSES: Record<BadgeColor, string> = {
  default: "bg-slate-100 text-slate-700",
  info:    "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger:  "bg-red-100 text-red-700",
  neutral: "bg-slate-100 text-slate-500",
};

interface AdminStatusBadgeProps {
  label: string;
  color?: BadgeColor;
  icon?: ReactNode;
  pulse?: boolean;
}

export default function AdminStatusBadge({
  label,
  color = "default",
  icon,
  pulse = false,
}: AdminStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors duration-200 ${COLOR_CLASSES[color]}`}
    >
      {pulse ? (
        <span className="relative flex size-2">
          <span className={`animate-ping absolute inline-flex size-full rounded-full opacity-75 ${color === "warning" ? "bg-amber-500" : color === "info" ? "bg-blue-500" : "bg-brand-pink"}`} />
          <span className={`relative inline-flex rounded-full size-2 ${color === "warning" ? "bg-amber-500" : color === "info" ? "bg-blue-500" : "bg-brand-pink"}`} />
        </span>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {label}
    </span>
  );
}

export { COLOR_CLASSES };
export type { BadgeColor };
