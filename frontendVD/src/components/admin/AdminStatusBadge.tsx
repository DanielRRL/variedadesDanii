/**
 * AdminStatusBadge — Consistent status pill with icon support.
 */

import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import "../../css/AdminStatusBadge.css";

type BadgeColor =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

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
  const pulseColor = color === "warning" ? "amber" : color === "info" ? "blue" : "pink";
  return (
    <span className={cn("admin-status-badge", `admin-status-badge--${color}`)}>
      {pulse ? (
        <span className="admin-status-badge__pulse">
          <span className={cn("admin-status-badge__pulse-ring", `admin-status-badge__pulse-ring--${pulseColor}`)} />
          <span className={cn("admin-status-badge__pulse-dot", `admin-status-badge__pulse-dot--${pulseColor}`)} />
        </span>
      ) : icon ? (
        <span className="admin-status-badge__icon">{icon}</span>
      ) : null}
      {label}
    </span>
  );
}

export type { BadgeColor };
