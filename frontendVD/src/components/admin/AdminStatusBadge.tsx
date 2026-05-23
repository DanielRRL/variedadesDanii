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
}

export default function AdminStatusBadge({
  label,
  color = "default",
  icon,
}: AdminStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${COLOR_CLASSES[color]}`}
    >
      {icon}
      {label}
    </span>
  );
}

export { COLOR_CLASSES };
export type { BadgeColor };
