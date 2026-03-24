/**
 * AppBar — Top application bar.
 *
 * Appears at the top of every screen. Provides:
 *  - Left side:  back arrow (if showBack=true) OR brand logo/name
 *  - Center:     page title (Poppins 500) or brand name
 *  - Right side: optional search icon, cart icon with item-count badge,
 *                user avatar, and loyalty level badge
 *
 * The loyalty badge in the header is a gamification hook — users see their
 * status (PREFERRED or VIP) on every screen, reinforcing the value of the
 * loyalty program without requiring them to visit the profile page.
 *
 * Data sources:
 *  - Cart item count: cartStore.items.length
 *  - Loyalty level:  authStore.user.loyaltyAccount?.level
 */

import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Search, Star, Crown } from 'lucide-react';
import { clsx } from 'clsx';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AppBarProps {
  /** Page title rendered in the center. Omit to show the brand name. */
  title?: string;
  /** If true, renders a back arrow on the left instead of the brand logo. */
  showBack?: boolean;
  /** If true, renders a search icon button on the right. */
  showSearch?: boolean;
  /** If true, renders the cart icon with item-count badge on the right. */
  showCart?: boolean;
  /**
   * Arbitrary right-side element. Rendered after the cart icon.
   * Use for page-specific actions (e.g., a filter button on the catalog page).
   */
  rightElement?: ReactNode;
  /** Callback when the search icon is pressed. */
  onSearchPress?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Small loyalty badge rendered next to the user avatar.
 * Only shown for PREFERRED and VIP levels — BASIC users see no badge so that
 * upgrading feels like a visible reward.
 */
function LoyaltyIndicator({ level }: { level: string | undefined }) {
  if (level === 'VIP') {
    return (
      <span
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-gold flex items-center justify-center"
        title="Cliente VIP"
        aria-label="Nivel VIP"
      >
        <Crown size={9} className="text-surface" strokeWidth={2.5} />
      </span>
    );
  }
  if (level === 'PREFERRED') {
    return (
      <span
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-gold flex items-center justify-center"
        title="Cliente Preferencial"
        aria-label="Nivel Preferencial"
      >
        <Star size={9} className="text-surface" strokeWidth={2.5} />
      </span>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Top app bar. Position it with the class `sticky top-0 z-40` on the page
 * wrapper, or let the layout shell handle it.
 */
export function AppBar({
  title,
  showBack = false,
  showSearch = false,
  showCart = true,
  rightElement,
  onSearchPress,
}: AppBarProps) {
  const navigate   = useNavigate();
  const cartItems  = useCartStore((s) => s.items);
  const user       = useAuthStore((s) => s.user);
  const level      = user?.loyaltyAccount?.level;
  const cartCount  = cartItems.length;

  /** Initials for the avatar fallback (e.g. "DA" from "Daniel Arias"). */
  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border h-14 flex items-center px-4 gap-3 shadow-card">
      {/* ── Left ──────────────────────────────────────────────────────────── */}
      <div className="flex-none w-8">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft size={20} className="text-text-primary" strokeWidth={2} />
          </button>
        ) : (
          /* Brand logo text — navigates home */
          <button
            onClick={() => navigate('/')}
            className="font-heading font-bold text-brand-pink text-base leading-none"
            aria-label="Inicio"
          >
            VD
          </button>
        )}
      </div>

      {/* ── Center title ──────────────────────────────────────────────────── */}
      <div className="flex-1 text-center">
        <span className="font-heading font-medium text-text-primary text-base leading-none">
          {title ?? 'Variedades DANII'}
        </span>
      </div>

      {/* ── Right actions ─────────────────────────────────────────────────── */}
      <div className="flex-none flex items-center gap-2">
        {/* Optional search icon */}
        {showSearch && (
          <button
            onClick={onSearchPress}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background transition-colors"
            aria-label="Buscar"
          >
            <Search size={20} className="text-text-primary" strokeWidth={1.8} />
          </button>
        )}

        {/* Cart icon with item count badge */}
        {showCart && (
          <button
            onClick={() => navigate('/carrito')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background transition-colors relative"
            aria-label={`Carrito, ${cartCount} ${cartCount === 1 ? 'producto' : 'productos'}`}
          >
            <ShoppingBag size={20} className="text-text-primary" strokeWidth={1.8} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-brand-pink text-surface text-[10px] font-body font-medium flex items-center justify-center leading-none">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        )}

        {/* User avatar + loyalty indicator */}
        {user && (
          <button
            onClick={() => navigate('/perfil')}
            className="relative w-8 h-8 rounded-full bg-brand-pink/10 border border-brand-pink/20 flex items-center justify-center"
            aria-label="Perfil"
          >
            <span
              className={clsx(
                'font-heading font-bold text-[11px] leading-none',
                level === 'VIP' ? 'text-brand-gold' : 'text-brand-pink'
              )}
            >
              {initials}
            </span>
            <LoyaltyIndicator level={level} />
          </button>
        )}

        {/* Arbitrary right element (e.g. filter button) */}
        {rightElement}
      </div>
    </header>
  );
}
