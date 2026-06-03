/**
 * AdminLayout.tsx — Persistent sidebar + top bar for all /admin/* routes.
 *
 * Sidebar groups 15 nav items into 5 collapsible sections on a dark
 * background. The top bar shows a time-aware greeting and notification bell.
 * Navigation collapses to icon-only on desktop toggle and slides in as an
 * overlay on mobile.
 */

import { useState, useMemo } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  TrendingUp,
  Package,
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
  Sun,
  Sunset,
  Moon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { adminGetPendingRedemptions } from "../../services/api";
import "../../css/AdminLayout.css";

// ─── Navigation sections with grouped items ──────────────────────────────

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  exact?: boolean;
  badge?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin", exact: true },
      { icon: ShoppingCart, label: "Pedidos", path: "/admin/pedidos" },
      { icon: Store, label: "Punto de Venta", path: "/admin/ventas" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { icon: ShoppingBag, label: "Productos", path: "/admin/productos" },
      { icon: Package, label: "Inventario", path: "/admin/inventario" },
      { icon: FlaskConical, label: "Esencias", path: "/admin/esencias" },
    ],
  },
  {
    label: "Clientes",
    items: [
      { icon: Users, label: "Clientes", path: "/admin/clientes" },
      { icon: Trophy, label: "Fidelización", path: "/admin/fidelizacion" },
      { icon: Gamepad2, label: "Gamificación", path: "/admin/gamificacion" },
      { icon: Gift, label: "Canjes", path: "/admin/canjes", badge: true },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { icon: TrendingUp, label: "Ganancias", path: "/admin/ganancias" },
      { icon: FileText, label: "Facturas", path: "/admin/facturas" },
      { icon: BarChart2, label: "Reportes", path: "/admin/reportes" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { icon: ArrowLeftRight, label: "Devoluciones", path: "/admin/devoluciones" },
      { icon: Settings, label: "Configuración", path: "/admin/configuracion" },
    ],
  },
];

// ─── Time-aware greeting ─────────────────────────────────────────────────

interface GreetingData {
  icon: React.ElementType;
  text: string;
}

function useGreeting(): GreetingData {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { icon: Sun, text: "Buenos días" };
    if (hour < 19) return { icon: Sunset, text: "Buenas tardes" };
    return { icon: Moon, text: "Buenas noches" };
  }, []);
}

// ─── AdminLayout ─────────────────────────────────────────────────────────

export default function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const greeting = useGreeting();
  const GreetingIcon = greeting.icon;

  const pathname = location.pathname;
  const pathSegments = pathname.startsWith("/admin/")
    ? pathname.replace("/admin/", "").split("/").filter(Boolean)
    : [];

  const buildPath = (index: number) => {
    const parts = pathSegments.slice(0, index + 1);
    return `/admin${parts.length ? "/" + parts.join("/") : ""}`;
  };

  const formatSegment = (segment: string) =>
    segment.charAt(0).toUpperCase() + segment.slice(1);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NAV_SECTIONS.map((s) => [s.label, true]))
  );

  const toggleSection = (label: string) =>
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));

  const { data: redemptionsRes } = useQuery({
    queryKey: ["admin-pending-redemptions-count"],
    queryFn: () => adminGetPendingRedemptions(1),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const pendingCount: number =
    (redemptionsRes?.data as { total?: number } | undefined)?.total ?? 0;

  const initials =
    user?.name
      ?.split(" ")
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") ?? "A";

  const firstName = user?.name?.split(" ")[0] ?? "Admin";

  return (
    <div className="admin-layout">
      {/* ── Skip to content link (accessibility) ─────────────────────── */}
      <a href="#admin-main-content" className="admin-layout__skip-link">
        Saltar al contenido principal
      </a>

      {/* ── Mobile backdrop ──────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="admin-layout__backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={clsx(
          "admin-sidebar",
          collapsed && "admin-sidebar--collapsed",
          sidebarOpen && "admin-sidebar--mobile-open",
        )}
      >
        {/* Brand header */}
        <div className="admin-sidebar__brand">
          <div
            className="admin-sidebar__brand-logo"
            onClick={() => { if (collapsed) setCollapsed(false); }}
            style={collapsed ? { cursor: 'pointer' } : undefined}
          >
            <div className="admin-sidebar__brand-logo-icon">VD</div>
            {!collapsed && (
              <div className="admin-sidebar__brand-logo-text">
                <span>Admin</span>
                <div className="admin-sidebar__brand-subtitle">Panel Administrativo</div>
              </div>
            )}
          </div>
          <div className="admin-sidebar__brand-btns">
            {/* Desktop collapse toggle */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="admin-sidebar__brand-btn admin-sidebar__brand-btn--desktop"
              aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {collapsed ? <Menu size={16} /> : <ChevronDown size={14} className="rotate-90" />}
            </button>
            {/* Mobile close */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="admin-sidebar__brand-btn admin-sidebar__brand-btn--mobile"
              aria-label="Cerrar menú"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="admin-sidebar__nav" aria-label="Navegación de administración">
          {NAV_SECTIONS.map((section) => {
            const isOpen = openSections[section.label] ?? true;
            return (
              <div key={section.label} className="admin-sidebar__section">
                {/* Section header — hidden when collapsed */}
                {!collapsed && (
                  <button
                    onClick={() => toggleSection(section.label)}
                    className="admin-sidebar__section-header"
                  >
                    <span className="admin-sidebar__section-label">{section.label}</span>
                    <ChevronDown
                      size={12}
                      className={clsx(
                        "admin-sidebar__section-chevron",
                        !isOpen && "admin-sidebar__section-chevron--closed",
                      )}
                    />
                  </button>
                )}

                {/* Section items */}
                <div
                  className={clsx(
                    "admin-sidebar__section-items",
                    isOpen || collapsed ? "admin-sidebar__section-items--open" : "admin-sidebar__section-items--closed",
                  )}
                >
                  {section.items.map(({ icon: Icon, label, path, exact, badge }) => (
                    <NavLink
                      key={path}
                      to={path}
                      end={exact}
                      onClick={() => {
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={({ isActive }) =>
                        clsx(
                          "admin-sidebar__nav-item",
                          isActive && "admin-sidebar__nav-item--active",
                        )
                      }
                      title={collapsed ? label : undefined}
                    >
                      <Icon size={18} className="admin-sidebar__nav-icon" />
                      {!collapsed && (
                        <>
                          <span className="admin-sidebar__nav-label">{label}</span>
                          {badge && pendingCount > 0 && (
                            <span className="admin-sidebar__nav-badge">
                              {pendingCount > 99 ? "99+" : pendingCount}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="admin-sidebar__footer">
          {/* Back to store */}
          <button
            onClick={() => navigate("/")}
            className="admin-sidebar__footer-store-btn"
          >
            <Home size={16} className="admin-sidebar__footer-store-icon" />
            {!collapsed && <span className="admin-sidebar__footer-store-label">Volver a la tienda</span>}
          </button>

          {/* User info */}
          <div className="admin-sidebar__footer-user">
            <div className="admin-sidebar__footer-avatar">
              <span className="admin-sidebar__footer-avatar-text">{initials}</span>
              <span className="admin-sidebar__footer-avatar-dot" />
            </div>
            {!collapsed && (
              <div className="admin-sidebar__footer-info">
                <p className="admin-sidebar__footer-name">{user?.name ?? "Admin"}</p>
                <p className="admin-sidebar__footer-role">Administrador</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="admin-layout__main">
        {/* Sticky top bar */}
        <header className="admin-topbar">
          <div className="admin-topbar__left">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="admin-topbar__hamburger"
              aria-label="Abrir menú"
            >
              <Menu size={18} />
            </button>
          </div>

          {/* ── Greeting — centered, animated on each nav ── */}
          <div className="admin-topbar__greeting" key={location.pathname}>
            {GreetingIcon && (
              <span className="admin-topbar__greeting-icon" style={{ animationDelay: "0.1s" }}>
                <GreetingIcon size={15} />
              </span>
            )}
            <span className="admin-topbar__greeting-text" style={{ animationDelay: "0.15s" }}>
              <span>{greeting.text}</span>
              <span className="admin-topbar__greeting-comma">, </span>
              <span className="admin-topbar__greeting-name">{firstName}</span>
            </span>
          </div>

          <div className="admin-topbar__right">
            <button
              className="admin-topbar__notif-btn"
              aria-label="Notificaciones"
            >
              <Bell size={18} />
              {pendingCount > 0 && (
                <span className="admin-topbar__notif-badge">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main id="admin-main-content" className="admin-layout__content">
          {pathname !== "/admin" && pathSegments.length > 0 && (
            <nav className="admin-layout__breadcrumbs">
              <Link to="/admin" className="admin-layout__breadcrumb-link">Dashboard</Link>
              {pathSegments.map((segment, i) => (
                <span key={segment} className="flex items-center gap-1.5">
                  <ChevronRight size={13} />
                  <Link
                    to={buildPath(i)}
                    className={i === pathSegments.length - 1 ? "admin-layout__breadcrumb-current" : "admin-layout__breadcrumb-link"}
                  >
                    {formatSegment(segment)}
                  </Link>
                </span>
              ))}
            </nav>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
