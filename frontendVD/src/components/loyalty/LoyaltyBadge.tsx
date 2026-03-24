/**
 * LoyaltyBadge — Visual level indicator for the loyalty program.
 *
 * Used in:
 *  - AppBar header (small size, next to user avatar)
 *  - ProfilePage  (medium size, in the loyalty section)
 *
 * This is a gamification element: the badge makes the user's status
 * visible throughout the app, motivating them to reach the next tier.
 *
 * Tiers:
 *  BASIC      → gray pill "Básico"
 *  PREFERRED  → gold pill with star "Preferencial"
 *  VIP        → dark-gold pill with crown "VIP"
 */

import { Star, Crown } from 'lucide-react';
import { clsx } from 'clsx';
import type { LoyaltyAccount } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LoyaltyBadgeProps {
  /** Loyalty tier from the user's LoyaltyAccount. */
  level: LoyaltyAccount['level'];
  /**
   * Size variant:
   *  - 'sm'  → used in AppBar header next to avatar
   *  - 'md'  → used in ProfilePage loyalty section
   */
  size?: 'sm' | 'md';
}

// ─────────────────────────────────────────────────────────────────────────────
// Config map — avoids a long if/else chain
// ─────────────────────────────────────────────────────────────────────────────

type BadgeConfig = {
  label: string;
  pillClass: string;
  textClass: string;
  Icon?: React.ElementType;
  iconClass: string;
};

const CONFIG: Record<LoyaltyAccount['level'], BadgeConfig> = {
  BASIC: {
    label:     'Básico',
    pillClass: 'bg-border',
    textClass: 'text-muted',
    iconClass: '',
  },
  PREFERRED: {
    label:     'Preferencial',
    pillClass: 'bg-brand-gold/20 border border-brand-gold/40',
    textClass: 'text-brand-gold',
    Icon:      Star,
    iconClass: 'text-brand-gold fill-brand-gold',
  },
  VIP: {
    label:     'VIP',
    pillClass: 'bg-brand-gold/30 border border-brand-gold',
    textClass: 'text-brand-gold font-semibold',
    Icon:      Crown,
    iconClass: 'text-brand-gold fill-brand-gold',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders a pill-shaped loyalty level badge.
 */
export function LoyaltyBadge({ level, size = 'md' }: LoyaltyBadgeProps) {
  const { label, pillClass, textClass, Icon, iconClass } = CONFIG[level];

  const iconSize  = size === 'sm' ? 10 : 13;
  const textSize  = size === 'sm' ? 'text-[10px]' : 'text-[13px]';
  const padding   = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2.5 py-1';
  const gap       = size === 'sm' ? 'gap-0.5' : 'gap-1';

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-body',
        pillClass,
        padding,
        gap
      )}
      aria-label={`Nivel de fidelización: ${label}`}
    >
      {Icon && (
        <Icon size={iconSize} className={iconClass} strokeWidth={2} />
      )}
      <span className={clsx('leading-none', textSize, textClass)}>
        {label}
      </span>
    </span>
  );
}
