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
import '../../css/AppBar.css';

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
  /** Visual variant: "catalog" uses glass morphism + gradient border. */
  variant?: 'default' | 'catalog';
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
        className="app-bar__loyalty-badge"
        title="Cliente VIP"
        aria-label="Nivel VIP"
      >
        <Crown size={9} strokeWidth={2.5} />
      </span>
    );
  }
  if (level === 'PREFERRED') {
    return (
      <span
        className="app-bar__loyalty-badge"
        title="Cliente Preferencial"
        aria-label="Nivel Preferencial"
      >
        <Star size={9} strokeWidth={2.5} />
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
  variant = 'default',
}: AppBarProps) {
  const navigate   = useNavigate();
  const cartCount  = useCartStore((s) => s.items.length);
  const user       = useAuthStore((s) => s.user);
  const level      = user?.loyaltyAccount?.level;

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
    <header className={clsx("app-bar", variant === 'catalog' && "app-bar--catalog")}>
      {/* ── Left ──────────────────────────────────────────────────────────── */}
      <div className="app-bar__left">
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="app-bar__icon-btn"
            aria-label="Volver"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
        ) : (
          /* Brand logo text — navigates home */
          <button
            onClick={() => navigate('/')}
            className="app-bar__brand"
            aria-label="Inicio"
          >
            <img src="/VDlogo.png" alt="VD Logo" className="app-bar__brand-img" />
          </button>
        )}
      </div>

      {/* ── Center title ──────────────────────────────────────────────────── */}
      <div className="app-bar__center">
        <span className="app-bar__title">
          {title ?? 'Variedades DANII'}
        </span>
      </div>

      {/* ── Right actions ─────────────────────────────────────────────────── */}
      <div className="app-bar__actions">
        {/* Optional search icon */}
        {showSearch && (
          <button
            onClick={onSearchPress}
            className="app-bar__icon-btn"
            aria-label="Buscar"
          >
            <Search size={20} strokeWidth={1.8} />
          </button>
        )}

        {/* Cart icon with item count badge */}
        {showCart && (
          <button
            onClick={() => navigate('/carrito')}
            className="app-bar__icon-btn app-bar__icon-btn--cart"
            aria-label={`Carrito, ${cartCount} ${cartCount === 1 ? 'producto' : 'productos'}`}
          >
            <ShoppingBag size={20} strokeWidth={1.8} />
            {cartCount > 0 && (
              <span className="app-bar__cart-badge">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        )}

        {/* User avatar + loyalty indicator */}
        {user && (
          <button
            onClick={() => navigate('/perfil')}
            className="app-bar__avatar"
            aria-label="Perfil"
          >
            <span
              className={clsx(
                'app-bar__avatar-text',
                level === 'VIP' ? 'app-bar__avatar-text--vip' : 'app-bar__avatar-text--default'
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
