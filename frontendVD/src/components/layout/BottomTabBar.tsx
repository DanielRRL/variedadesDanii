/**
 * BottomTabBar — Single source of truth for bottom navigation.
 *
 * All client-facing pages must render this component at the bottom of the screen.
 * It is the ONLY navigation bar used across all screens; there is no side-drawer
 * or hamburger menu on mobile. Four fixed tabs:
 *
 *   1. Inicio    (/)          HomeIcon
 *   2. Catálogo  (/catalogo)  SearchIcon
 *   3. Pedidos   (/pedidos)   PackageIcon  — shows badge with active order count
 *   4. Perfil    (/perfil)    UserIcon
 *
 * Active tab: brand-pink text + pink filled pill behind icon.
 * Inactive tab: muted text + plain gray icon.
 *
 * The component is fixed at the bottom (z-50) with a white background and a
 * 1px top border using the brand border color. Height is 64px, with additional
 * padding equal to env(safe-area-inset-bottom) for iOS notch-enabled devices.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Package, User } from 'lucide-react';
import { clsx } from 'clsx';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Tab {
  label: string;
  route: string;
  /** Lucide icon component. */
  Icon: React.ElementType;
  /** Optional badge count. When > 0 a small red circle appears on the icon. */
  badge?: number;
}

interface BottomTabBarProps {
  /** Active orders count — drives the badge on the Pedidos tab. Pass 0 to hide. */
  activeOrderCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders the fixed bottom navigation bar.
 *
 * @param activeOrderCount - Number of orders in a non-terminal state (PENDING, PAID,
 *   PREPARING, READY). Passed by the page that renders this bar, typically fetched
 *   via React Query from GET /api/orders filtered client-side.
 */
export function BottomTabBar({ activeOrderCount = 0 }: BottomTabBarProps) {
  const location = useLocation();

  const tabs: Tab[] = [
    { label: 'Inicio',    route: '/',         Icon: Home    },
    { label: 'Catálogo',  route: '/catalogo',  Icon: Search  },
    { label: 'Pedidos',   route: '/pedidos',   Icon: Package, badge: activeOrderCount },
    { label: 'Perfil',    route: '/perfil',    Icon: User    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegación principal"
    >
      <ul className="flex h-16 items-stretch">
        {tabs.map(({ label, route, Icon, badge }) => {
          // Exact match for home (/), prefix match for the rest.
          const isActive =
            route === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(route);

          return (
            <li key={route} className="flex-1">
              <NavLink
                to={route}
                end={route === '/'}
                className="flex flex-col items-center justify-center h-full gap-0.5 select-none"
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Icon + badge container */}
                <span className="relative">
                  {/* Active state: pink pill behind icon */}
                  <span
                    className={clsx(
                      'flex items-center justify-center w-10 h-6 rounded-full transition-colors',
                      isActive ? 'bg-brand-pink/10' : ''
                    )}
                  >
                    <Icon
                      size={20}
                      className={clsx(
                        'transition-colors',
                        isActive ? 'text-brand-pink' : 'text-muted'
                      )}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                  </span>

                  {/* Badge bubble — shown only when badge > 0 */}
                  {badge != null && badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-brand-pink text-surface text-[10px] font-body font-medium flex items-center justify-center leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>

                {/* Label */}
                <span
                  className={clsx(
                    'text-[11px] font-body leading-none transition-colors',
                    isActive ? 'text-brand-pink font-medium' : 'text-muted font-normal'
                  )}
                >
                  {label}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
