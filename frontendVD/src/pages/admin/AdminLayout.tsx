/**
 * AdminLayout.tsx — Persistent sidebar + top bar for all /admin/* routes.
 *
 * Sidebar groups 15 nav items into 5 collapsible sections on a dark
 * background (slate-800). The top bar shows a time-aware greeting and
 * notification bell. Navigation collapses to icon-only on desktop toggle
 * and slides in as an overlay on mobile.
 */

import { useState, useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { adminGetPendingRedemptions } from "../../services/api";

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
  const greeting = useGreeting();
  const GreetingIcon = greeting.icon;

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

  const sidebarWidth = collapsed ? "w-[68px]" : "w-60";
  const collapseIcon = collapsed ? (
    <Menu size={16} />
  ) : (
    <ChevronDown size={14} className="rotate-90" />
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* ── Skip to content link (accessibility) ─────────────────────── */}
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:bg-brand-pink focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Saltar al contenido principal
      </a>

      {/* ── Mobile backdrop ──────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={`shrink-0 ${sidebarWidth} bg-sidebar-bg flex flex-col h-screen transition-[width,margin] duration-200 ${
          sidebarOpen ? "ml-0" : "-ml-60 lg:ml-0"
        } ${collapsed ? "lg:w-[68px]" : ""}`}
      >
        {/* Brand header */}
        <div className="px-4 py-4 border-b border-white/[0.08] shrink-0 flex items-center justify-between">
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-heading font-bold text-brand-pink text-sm leading-tight">
                Variedades DANII
              </p>
              <p className="text-[10px] text-sidebar-text/60 uppercase tracking-[0.15em] mt-0.5">
                Panel Admin
              </p>
            </div>
          )}
          <div className="flex items-center gap-1">
            {/* Desktop collapse toggle */}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="hidden lg:flex p-1.5 rounded-lg text-sidebar-text/50 hover:text-sidebar-text hover:bg-sidebar-hover transition-colors"
              aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              {collapseIcon}
            </button>
            {/* Mobile close */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-sidebar-text/50 hover:text-sidebar-text hover:bg-sidebar-hover transition-colors lg:hidden"
              aria-label="Cerrar menú"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto py-3 px-2"
          aria-label="Navegación de administración"
        >
          {NAV_SECTIONS.map((section) => {
            const isOpen = openSections[section.label] ?? true;
            return (
              <div key={section.label} className="mb-1">
                {/* Section header — hidden when collapsed */}
                {!collapsed && (
                  <button
                    onClick={() => toggleSection(section.label)}
                    className="w-full flex items-center gap-2 px-3 pt-3 pb-1.5 text-[10px] font-semibold text-sidebar-text/40 uppercase tracking-[0.12em] hover:text-sidebar-text/60 transition-colors cursor-pointer"
                  >
                    <span className="flex-1 text-left">{section.label}</span>
                    <ChevronDown
                      size={12}
                      className={`transition-transform duration-150 ${isOpen ? "" : "-rotate-90"}`}
                    />
                  </button>
                )}

                {/* Section items */}
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    isOpen || collapsed ? "max-h-96" : "max-h-0"
                  }`}
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
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors mb-0.5 ${
                          collapsed ? "justify-center px-2" : ""
                        } ${
                          isActive
                            ? "bg-brand-pink/10 text-brand-pink border-l-[3px] border-brand-pink -ml-[8px] pl-[11px]"
                            : "text-sidebar-text hover:bg-sidebar-hover hover:text-white border-l-[3px] border-transparent"
                        }`
                      }
                      title={collapsed ? label : undefined}
                    >
                      <Icon
                        size={18}
                        className="shrink-0"
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{label}</span>
                          {badge && pendingCount > 0 && (
                            <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-brand-pink text-white text-[10px] font-bold px-1.5 leading-none">
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
        <div className="px-3 py-3 border-t border-white/[0.08] shrink-0 space-y-2">
          {/* Back to store */}
          <button
            onClick={() => navigate("/")}
            className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sidebar-text/50 hover:text-sidebar-text hover:bg-sidebar-hover transition-colors w-full text-xs ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Home size={16} className="shrink-0" />
            {!collapsed && <span>Volver a la tienda</span>}
          </button>

          {/* User info */}
          <div
            className={`flex items-center gap-2.5 px-2 py-1.5 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-brand-pink flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold leading-none">
                {initials}
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sidebar-text truncate leading-tight">
                  {user?.name ?? "Admin"}
                </p>
                <p className="text-[10px] text-sidebar-text/50">
                  Administrador
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors lg:hidden shrink-0"
              aria-label="Abrir menú"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <GreetingIcon size={17} className="text-brand-pink shrink-0" />
              <p className="text-[13px] text-slate-600 truncate">
                {greeting.text},{" "}
                <span className="font-semibold text-slate-800">{firstName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              className="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Notificaciones"
            >
              <Bell size={18} />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-brand-pink text-white text-[9px] font-bold px-1 leading-none">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main id="admin-main-content" className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
