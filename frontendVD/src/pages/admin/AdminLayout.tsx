/**
 * AdminLayout.tsx — Persistent sidebar + top bar for all /admin/* routes.
 *
 * Use with React Router v6 nested routes: this component renders <Outlet />
 * in the main content area so child pages (Dashboard, Orders, etc.) fill that space.
 *
 * The sidebar is collapsible on all screen sizes. On mobile it overlays with
 * a backdrop; on desktop it pushes the main content.
 */

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  TrendingUp,
  FlaskConical,
  Users,
  Trophy,
  Gamepad2,
  Gift,
  FileText,
  BarChart2,
  ArrowLeftRight,
  Store,
  Settings,
  Bell,
  Menu,
  X,
  Home,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { adminGetPendingRedemptions } from '../../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Navigation items
// ─────────────────────────────────────────────────────────────────────────────

const NAV = [
  { Icon: LayoutDashboard, label: 'Dashboard',    path: '/admin',               exact: true  },
  { Icon: ShoppingBag,     label: 'Productos',    path: '/admin/productos',     exact: false },
  { Icon: Package,         label: 'Inventario',   path: '/admin/inventario',    exact: false },
  { Icon: ShoppingCart,    label: 'Pedidos',       path: '/admin/pedidos',       exact: false },
  { Icon: Store,            label: 'Punto de Venta', path: '/admin/ventas',       exact: false },
  { Icon: TrendingUp,       label: 'Ganancias',      path: '/admin/ganancias',    exact: false },
  { Icon: FlaskConical,    label: 'Esencias',      path: '/admin/esencias',      exact: false },
  { Icon: Users,           label: 'Clientes',      path: '/admin/clientes',      exact: false },
  { Icon: Trophy,          label: 'Fidelización',  path: '/admin/fidelizacion',  exact: false },
  { Icon: Gamepad2,        label: 'Gamificación',  path: '/admin/gamificacion',  exact: false },
  { Icon: Gift,            label: 'Canjes',        path: '/admin/canjes',        exact: false, badge: true },
  { Icon: FileText,        label: 'Facturas',      path: '/admin/facturas',      exact: false },
  { Icon: BarChart2,       label: 'Reportes',      path: '/admin/reportes',      exact: false },
  { Icon: ArrowLeftRight,  label: 'Devoluciones',  path: '/admin/devoluciones',  exact: false },
  { Icon: Settings,        label: 'Configuración', path: '/admin/configuracion', exact: false },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// AdminLayout
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: redemptionsRes } = useQuery({
    queryKey: ['admin-pending-redemptions-count'],
    queryFn: () => adminGetPendingRedemptions(1),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const pendingCount: number =
    (redemptionsRes?.data as { total?: number } | undefined)?.total ?? 0;

  const initials =
    user?.name
      ?.split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') ?? 'A';

  const firstName = user?.name?.split(' ')[0] ?? 'Admin';

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Backdrop for mobile (when sidebar overlays) ──────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 h-full w-55 bg-white border-r border-border flex flex-col z-40 transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header + close button */}
        <div className="px-5 py-4 border-b border-border shrink-0 flex items-center justify-between">
          <div>
            <p className="font-heading font-bold text-brand-pink text-sm leading-tight">
              Variedades DANII
            </p>
            <p className="text-[10px] text-muted uppercase tracking-widest mt-0.5">
              Panel de Administración
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-muted hover:bg-gray-100 transition-colors lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={16} />
          </button>
        </div>

        {/* Back to store link */}
        <button
          onClick={() => navigate('/')}
          className="mx-2 mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-blue hover:bg-blue-50 transition-colors"
        >
          <Home size={16} className="text-brand-blue" />
          <span>Volver a la tienda</span>
        </button>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto py-2" aria-label="Navegación de administración">
          {NAV.map(({ Icon, label, path, exact, ...rest }) => (
            <NavLink
              key={path}
              to={path}
              end={exact}
              onClick={() => {
                // Close sidebar on mobile after navigation
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-brand-pink/10 text-brand-pink'
                    : 'text-text-primary hover:bg-gray-50 hover:text-brand-pink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    className={isActive ? 'text-brand-pink' : 'text-muted'}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className="flex-1">{label}</span>
                  {'badge' in rest && (rest as { badge?: boolean }).badge && pendingCount > 0 && (
                    <span className="ml-auto min-w-5 h-5 flex items-center justify-center rounded-full bg-brand-pink text-white text-[10px] font-bold px-1.5">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Admin account footer */}
        <div className="px-4 py-3 border-t border-border flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-brand-pink flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold leading-none">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-primary truncate leading-tight">
              {user?.name ?? 'Admin'}
            </p>
            <p className="text-[10px] text-muted">Administrador</p>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-[margin] duration-200 lg:ml-55"
      >
        {/* Sticky top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-border h-14 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger toggle — mobile only */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-2 rounded-lg text-muted hover:bg-gray-100 transition-colors lg:hidden"
              aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              <Menu size={18} />
            </button>
            <p className="font-body text-sm text-text-primary">
              Buenos días, <span className="font-semibold">{firstName}</span> 👋
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="relative p-2 rounded-lg text-muted hover:bg-gray-50 transition-colors"
              aria-label="Notificaciones"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-pink pointer-events-none" />
            </button>

            <div className="w-8 h-8 rounded-full bg-brand-pink flex items-center justify-center">
              <span className="text-white text-xs font-bold leading-none">{initials}</span>
            </div>
          </div>
        </header>

        {/* Child page rendered here */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
