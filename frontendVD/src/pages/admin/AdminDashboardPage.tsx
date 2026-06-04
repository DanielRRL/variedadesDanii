/**
 * AdminDashboardPage — Premium corporate dashboard.
 *
 * Data sources:
 *  - GET /api/admin/dashboard            → KPI cards + recent orders + top essences
 *  - GET /api/admin/reports/daily-sales  → AreaChart (period toggle: Hoy/Semana/Mes)
 *  - GET /api/admin/reports/low-stock    → inline alert card
 *  - GET /api/admin/gamification/stats   → gamification KPI cards
 *  - GET /api/admin/reports/sales-by-type → donut chart
 *  - GET /api/admin/redemptions          → pending redemptions alert
 *
 * Auto-refreshes every 30s. Status changes invalidate the dashboard query.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToastStore } from "../../stores/toastStore";
import {
  ShoppingBag,
  CreditCard,
  UserPlus,
  AlertTriangle,
  Eye,
  Gem,
  Gift,
  Clock,
  Download,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

import {
  getDashboardStats,
  getDailySales,
  getLowStockAlerts,
  updateOrderStatus,
  getGamificationStats,
  getSalesByProductType,
  adminGetPendingRedemptions,
  downloadSalesCSV,
} from "../../services/api";
import { formatCOP, formatCOPSplit } from "../../utils/format";
import { cn } from "../../utils/cn";
import { STATUS_LABELS, VALID_TRANSITIONS, TRANSITION_LABELS } from "./adminShared";
import AdminKpiCard from "../../components/admin/AdminKpiCard";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import AdminConfirmDialog from "../../components/admin/AdminConfirmDialog";
import { AdminSkeleton } from "../../components/admin/AdminSkeleton";
import { AdminQueryError } from "../../components/admin/AdminQueryError";
import "../../css/AdminDashboardPage.css";
import type { AdminOrder } from "../../types";

type Period = "today" | "week" | "month";
const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoy",
  week: "Semana",
  month: "Mes",
};

function getDateRange(period: Period): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const from = new Date(today);
  if (period === "week") from.setDate(from.getDate() - 7);
  if (period === "month") from.setDate(from.getDate() - 30);
  from.setHours(0, 0, 0, 0);

  return {
    from: from.toISOString(),
    to: period === "today" ? tomorrow.toISOString() : today.toISOString(),
  };
}

const CHART_PINK = "#0F0F0F";
const GRID_STROKE = "#F1F5F9";

const DONUT_COLORS = [
  "#D81B60",
  "#1565C0",
  "#F9A825",
  "#2E7D32",
  "#8E24AA",
  "#FF7043",
  "#26A69A",
];

function StatusDropdown({
  orderId,
  current,
  onUpdated,
}: {
  orderId: string;
  current: string;
  onUpdated: () => void;
}) {
  const addToast = useToastStore((s) => s.addToast);
  const [open, setOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const next = VALID_TRANSITIONS[current] ?? [];

  const mutation = useMutation({
    mutationFn: (status: string) => updateOrderStatus(orderId, status),
    onSuccess: () => onUpdated(),
    onError: () => addToast("Error al actualizar el estado del pedido.", "error"),
  });

  if (next.length === 0) return null;

  const executeTransition = (status: string) => {
    setOpen(false);
    mutation.mutate(status);
  };

  return (
    <>
      <div className="admin-dashboard__status-dropdown">
        <button
          disabled={mutation.isPending}
          onClick={() => setOpen((v) => !v)}
          className="admin-dashboard__status-trigger"
          aria-label="Cambiar estado"
        >
          {mutation.isPending ? (
            <span className="admin-dashboard__status-spinner" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="3" cy="7" r="1.5" />
              <circle cx="7" cy="7" r="1.5" />
              <circle cx="11" cy="7" r="1.5" />
            </svg>
          )}
        </button>
        {open && (
          <>
            <div className="admin-dashboard__status-backdrop" onClick={() => setOpen(false)} />
            <div className="admin-dashboard__status-menu">
              {next.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    s === "CANCELLED"
                      ? (setOpen(false), setConfirmCancel(true))
                      : executeTransition(s)
                  }
                  className={cn(
                    "admin-dashboard__status-option",
                    s === "CANCELLED" && "admin-dashboard__status-option--danger",
                  )}
                >
                  {TRANSITION_LABELS[s] ?? STATUS_LABELS[s] ?? s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <AdminConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          executeTransition("CANCELLED");
        }}
        title="Cancelar pedido"
        message="¿Confirmas cancelar este pedido? Esta acción no se puede deshacer."
        confirmLabel="Cancelar pedido"
        variant="danger"
        loading={mutation.isPending}
      />
    </>
  );
}

import type { BadgeColor } from "../../components/admin/AdminStatusBadge";

function statusColor(status: string): BadgeColor {
  const map: Record<string, BadgeColor> = {
    PENDING: "warning",
    PAID: "info",
    PREPARING: "warning",
    READY: "success",
    DELIVERED: "success",
    CANCELLED: "danger",
  };
  return map[status] ?? "default";
}

function PageSectionHeading({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "admin-dashboard__section-heading",
        className,
      )}
    >
      {children}
    </h2>
  );
}

function PeriodToggle({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="admin-dashboard__period-toggle">
      {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "admin-dashboard__period-btn",
            period === p && "admin-dashboard__period-btn--active",
          )}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [period, setPeriod] = useState<Period>("today");
  const [downloadingCSV, setDownloadingCSV] = useState(false);

  const {
    data: dashRes,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  });

  const { data: salesRes, isError: salesError } = useQuery({
    queryKey: ["admin-sales-chart", period],
    queryFn: () => getDailySales(getDateRange(period)),
    staleTime: 2 * 60_000,
  });

  const { data: lowStockRes, isError: lowStockError } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: () => getLowStockAlerts(),
    staleTime: 5 * 60_000,
  });

  const { data: gamifRes, isError: gamifError } = useQuery({
    queryKey: ["admin-gamification-stats"],
    queryFn: getGamificationStats,
    staleTime: 5 * 60_000,
  });

  const { data: salesTypeRes, isError: salesTypeError } = useQuery({
    queryKey: ["admin-sales-by-type", period],
    queryFn: () => getSalesByProductType(getDateRange(period)),
    staleTime: 5 * 60_000,
  });

  const { data: redemptionsRes, isError: redemptionsError } = useQuery({
    queryKey: ["admin-pending-redemptions-dash"],
    queryFn: () => adminGetPendingRedemptions(1),
    staleTime: 60_000,
  });

  const handleExportCSV = async () => {
    setDownloadingCSV(true);
    try {
      const res = await downloadSalesCSV(getDateRange(period));
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `ventas_${getDateRange(period).from}_${getDateRange(period).to}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      addToast("Error al descargar el reporte.", "error");
    } finally {
      setDownloadingCSV(false);
    }
  };

  const stats = dashRes?.data ?? {};

  const salesToday = stats.salesToday ?? 0;
  const salesGoal = stats.salesGoal ?? 1_000_000;
  const salesPct =
    stats.salesPercent ??
    Math.round((salesToday / Math.max(1, salesGoal)) * 100);
  const ordersToday = stats.ordersToday ?? 0;
  const vsYesterday = stats.ordersTodayVsYesterday ?? 0;
  const avgTicket = stats.averageTicket ?? 0;
  const newClients = stats.newClientsToday ?? 0;

  const topEssences: { name: string; revenue: number; rank: number }[] =
    stats.topEssences ?? [];
  const recentOrders: AdminOrder[] = stats.recentOrders ?? [];

  const gamifStats = gamifRes?.data ?? {};
  const gramsIssued = gamifStats.totalGramsIssued ?? 0;
  const activeTokens = gamifStats.activeTokens ?? 0;
  const pendingRedemptions =
    (redemptionsRes?.data as { total?: number } | undefined)?.total ?? 0;

  const salesByType: { name: string; value: number }[] =
    (
      salesTypeRes?.data as {
        types?: { name: string; value: number }[];
      } | undefined
    )?.types ?? [];

  const chartLabels: string[] = salesRes?.data?.labels ?? [];
  const chartValues: number[] = salesRes?.data?.values ?? [];
  const chartData = chartLabels.map((time, i) => ({
    time,
    amount: chartValues[i] ?? 0,
  }));

  const lowStockList: { name: string; stockMl: number }[] =
    lowStockRes?.data?.essences ?? lowStockRes?.data ?? [];

  const topEssenceData = topEssences.slice(0, 5).map((ess) => ({
    name: ess.name.length > 18 ? ess.name.slice(0, 16) + "\u2026" : ess.name,
    revenue: ess.revenue,
  }));

  if (isLoading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard__bg" aria-hidden="true">
          <div className="admin-dashboard__blob admin-dashboard__blob--1" />
          <div className="admin-dashboard__blob admin-dashboard__blob--2" />
          <div className="admin-dashboard__blob admin-dashboard__blob--3" />
        </div>
        <div className="admin-dashboard__skeleton">
          <div className="admin-dashboard__kpi-grid admin-dashboard__kpi-grid--commerce">
            <AdminSkeleton.Card />
            <AdminSkeleton.Card />
            <AdminSkeleton.Card />
            <AdminSkeleton.Card />
          </div>
          <div className="admin-dashboard__gamif-grid">
            <AdminSkeleton.Card />
            <AdminSkeleton.Card />
            <AdminSkeleton.Card />
          </div>
          <AdminSkeleton.Chart />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard__bg" aria-hidden="true">
          <div className="admin-dashboard__blob admin-dashboard__blob--1" />
          <div className="admin-dashboard__blob admin-dashboard__blob--2" />
          <div className="admin-dashboard__blob admin-dashboard__blob--3" />
        </div>
        <div className="admin-dashboard__content">
          <AdminQueryError
            message={error?.message}
            onRetry={() =>
              queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* ── Background decorative blobs ──────────────────────────────────── */}
      <div className="admin-dashboard__bg" aria-hidden="true">
        <div className="admin-dashboard__blob admin-dashboard__blob--1" />
        <div className="admin-dashboard__blob admin-dashboard__blob--2" />
        <div className="admin-dashboard__blob admin-dashboard__blob--3" />
      </div>

      <div className="admin-dashboard__content">
        {/* ── Alert cards ────────────────────────────────────────────────── */}
        <div className="admin-dashboard__alerts">
          {lowStockError && (
            <div className="admin-dashboard__alert admin-dashboard__alert--error">
              <AlertTriangle size={14} className="admin-dashboard__alert-icon" />
              <p className="admin-dashboard__alert-text">
                Error al cargar alertas de stock.
              </p>
            </div>
          )}
          {!lowStockError && lowStockList.length > 0 && (
            <div className="admin-dashboard__alert admin-dashboard__alert--warning">
              <AlertTriangle size={14} className="admin-dashboard__alert-icon" />
              <p className="admin-dashboard__alert-text">
                <span className="font-semibold">{lowStockList.length}</span>{" "}
                stock bajo:{" "}
                {lowStockList
                  .slice(0, 2)
                  .map((e) => e.name)
                  .join(", ")}
                {lowStockList.length > 2
                  ? ` y ${lowStockList.length - 2} m\u00e1s`
                  : ""}
              </p>
              <Link
                to="/admin/inventario"
                className="admin-dashboard__alert-link"
              >
                Ver
              </Link>
            </div>
          )}

          {redemptionsError && (
            <div className="admin-dashboard__alert admin-dashboard__alert--error">
              <AlertTriangle size={14} className="admin-dashboard__alert-icon" />
              <p className="admin-dashboard__alert-text">
                Error al cargar canjes pendientes.
              </p>
            </div>
          )}
          {!redemptionsError && pendingRedemptions > 0 && (
            <div className="admin-dashboard__alert admin-dashboard__alert--purple">
              <Gift size={14} className="admin-dashboard__alert-icon" />
              <p className="admin-dashboard__alert-text">
                <span className="font-semibold">
                  {pendingRedemptions} canje
                  {pendingRedemptions > 1 ? "s" : ""} pendiente
                  {pendingRedemptions > 1 ? "s" : ""}
                </span>
              </p>
              <Link
                to="/admin/canjes"
                className="admin-dashboard__alert-link"
              >
                Gestionar
              </Link>
            </div>
          )}
        </div>

        {/* ── Commerce + Gamification KPIs ──────────────────────────────── */}
        <section className="admin-dashboard__kpi-section">
          <div className="admin-dashboard__kpi-group">
            <div className="admin-dashboard__kpi-group-header">
              <span className="admin-dashboard__kpi-group-bar admin-dashboard__kpi-group-bar--commerce" />
              <div>
                <span className="admin-dashboard__kpi-group-label">Comercio</span>
                <div className="admin-dashboard__kpi-group-subtitle">Indicadores clave</div>
              </div>
            </div>
            <div className="admin-dashboard__kpi-grid admin-dashboard__kpi-grid--commerce">
              <AdminKpiCard
                label="Ventas Hoy"
                splitValue={formatCOPSplit(salesToday)}
                progress={salesPct}
                progressLabel={`${salesPct}% del objetivo`}
              />
              <AdminKpiCard
                icon={ShoppingBag}
                label="Pedidos Hoy"
                value={String(ordersToday)}
                trend={vsYesterday > 0 ? "up" : vsYesterday < 0 ? "down" : "flat"}
                trendPct={Math.abs(vsYesterday)}
                trendLabel="vs ayer"
              />
              <AdminKpiCard
                icon={CreditCard}
                label="Ticket Promedio"
                splitValue={formatCOPSplit(avgTicket)}
                subtitle="Pedidos de hoy"
              />
              <AdminKpiCard
                icon={UserPlus}
                label="Clientes Nuevos"
                value={String(newClients)}
                subtitle="Registrados hoy"
              />
            </div>
          </div>

          <div className="admin-dashboard__kpi-group">
            <div className="admin-dashboard__kpi-group-header">
              <span className="admin-dashboard__kpi-group-bar admin-dashboard__kpi-group-bar--gamification" />
              <span className="admin-dashboard__kpi-group-label">Gamificación</span>
            </div>
            {gamifError ? (
              <div className="admin-dashboard__error-card">
                <p>
                  Error al cargar estadísticas de gamificación.
                </p>
              </div>
            ) : (
              <div className="admin-dashboard__gamif-grid">
                <AdminKpiCard
                  icon={Gem}
                  label="Gramos Emitidos"
                  value={`${gramsIssued}g`}
                  subtitle="Total acumulado"
                />
                <AdminKpiCard
                  icon={Gift}
                  label="Canjes Pendientes"
                  value={String(pendingRedemptions)}
                  subtitle="Esperando entrega"
                />
                <AdminKpiCard
                  icon={Clock}
                  label="Fichas Activas"
                  value={String(activeTokens)}
                  subtitle="Sin jugar aún"
                />
              </div>
            )}
          </div>
        </section>

        {/* ── Sales chart + Top 5 essences ────────────────────────────────── */}
        <div className="admin-dashboard__charts-row">
          <div className="admin-dashboard__chart-card">
            <div className="admin-dashboard__chart-header">
              <PageSectionHeading className="admin-dashboard__section-heading--inline">
                Ventas por período
              </PageSectionHeading>
              <PeriodToggle period={period} onChange={setPeriod} />
              <button
                onClick={handleExportCSV}
                disabled={downloadingCSV}
                aria-label="Descargar CSV"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.375rem",
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "#64748B",
                  border: "1px solid #E2E8F0",
                  borderRadius: "0.5rem",
                  background: "white",
                  cursor: downloadingCSV ? "wait" : "pointer",
                  opacity: downloadingCSV ? 0.5 : 1,
                  transition: "background 0.15s",
                }}
              >
                {downloadingCSV ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Download size={12} />
                )}
                CSV
              </button>
            </div>

            {salesError ? (
              <div className="admin-dashboard__chart-error">
                Error al cargar datos de ventas.
              </div>
            ) : chartData.length === 0 ? (
              <div className="admin-dashboard__chart-empty">
                Sin datos para este período
              </div>
            ) : (
              <div className="admin-dashboard__chart-top-title">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_PINK} stopOpacity={0.04} />
                        <stop offset="95%" stopColor={CHART_PINK} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={GRID_STROKE}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v: number) =>
                        `$${(v / 1_000).toFixed(0)}k`
                      }
                      tick={{ fontSize: 11, fill: "#94A3B8" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      formatter={(v: unknown) => [formatCOP(v as number), "Ventas"]}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #E2E8F0",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke={CHART_PINK}
                      strokeWidth={1.5}
                      fill="url(#areaGrad)"
                      dot={false}
                      activeDot={{ r: 3, fill: CHART_PINK }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="admin-dashboard__chart-card">
            <PageSectionHeading>Top 5 Esencias hoy</PageSectionHeading>
            {topEssenceData.length === 0 ? (
              <p className="text-[13px] text-slate-400 mt-4">
                Sin ventas registradas hoy.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200} className="mt-2">
                <BarChart
                  data={topEssenceData}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID_STROKE}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) =>
                      `$${(v / 1_000).toFixed(0)}k`
                    }
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    formatter={(v: unknown) => [formatCOP(v as number), "Ventas"]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#1A1A1A"
                    radius={[0, 2, 2, 0]}
                    barSize={12}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Sales by product type donut ──────────────────────────────────── */}
        {salesTypeError ? (
          <div className="admin-dashboard__error-card">
            <p>
              Error al cargar ventas por tipo de producto.
            </p>
          </div>
        ) : (
          salesByType.length > 0 && (
            <div className="admin-dashboard__chart-card">
              <PageSectionHeading>
                Ventas por tipo de producto
              </PageSectionHeading>
              <ResponsiveContainer width="100%" height={240} className="mt-2">
                <PieChart>
                  <Pie
                    data={salesByType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {salesByType.map((_, i) => (
                      <Cell
                        key={i}
                        fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: unknown) => [formatCOP(v as number), "Ventas"]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )
        )}

        {/* ── Recent orders ────────────────────────────────────────────────── */}
        <div className="admin-dashboard__orders">
          <div className="admin-dashboard__orders-header">
            <PageSectionHeading className="admin-dashboard__section-heading--inline">
              Pedidos Recientes
            </PageSectionHeading>
            <Link
              to="/admin/pedidos"
              className="admin-dashboard__orders-link"
            >
              Ver todos →
            </Link>
          </div>
          <div className="admin-dashboard__orders-scroll">
            <table className="admin-dashboard__orders-table">
              <thead>
                <tr>
                  {[
                    { label: "PEDIDO #", hide: false as const },
                    { label: "CLIENTE", hide: "md" as const },
                    { label: "ESENCIAS", hide: "md" as const },
                    { label: "TOTAL", hide: false as const },
                    { label: "ESTADO", hide: false as const },
                    { label: "", hide: false as const },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className={cn(
                        "admin-dashboard__orders-th",
                        col.hide === "md" && "admin-dashboard__orders-th--hide-mobile",
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-dashboard__orders-empty">
                      <div className="admin-dashboard__orders-empty-icon">
                        <div className="admin-dashboard__orders-empty-icon-inner" />
                        <ShoppingBag size={28} className="text-brand-pink/40" strokeWidth={1.5} />
                      </div>
                      <p className="admin-dashboard__orders-empty-title">
                        Sin pedidos aún
                      </p>
                      <p className="admin-dashboard__orders-empty-text">
                        Los pedidos del día aparecerán aquí.
                      </p>
                      <Link
                        to="/admin/pedidos"
                        className="admin-dashboard__orders-empty-cta"
                      >
                        <Eye size={14} />
                        Ver pedidos anteriores
                      </Link>
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => {
                    const initials =
                      order.client?.name
                        ?.split(" ")
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("") ?? "?";
                    const essenceItems =
                      order.items
                        ?.map(
                          (it) => it.product?.name ?? "",
                        )
                        .filter(Boolean) ?? [];

                    return (
                      <tr
                        key={order.id}
                        className="admin-dashboard__orders-row"
                      >
                        <td className="admin-dashboard__orders-td">
                          <span className="admin-dashboard__orders-number">
                            {order.orderNumber}
                          </span>
                        </td>
                        <td className="admin-dashboard__orders-td admin-dashboard__orders-td--hide-mobile">
                          <div className="admin-dashboard__orders-client">
                            <div className="admin-dashboard__orders-client-avatar">
                              <span>{initials}</span>
                            </div>
                            <span className="admin-dashboard__orders-client-name">
                              {order.client?.name ?? "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="admin-dashboard__orders-td admin-dashboard__orders-td--hide-mobile">
                          <div className="admin-dashboard__orders-items">
                            {essenceItems.slice(0, 3).map((name, i) => (
                              <span
                                key={i}
                                className="admin-dashboard__orders-item-tag"
                              >
                                {name}
                              </span>
                            ))}
                            {essenceItems.length > 3 && (
                              <span className="admin-dashboard__orders-more">
                                +{essenceItems.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="admin-dashboard__orders-td admin-dashboard__orders-total">
                          {formatCOP(order.total)}
                        </td>
                        <td className="admin-dashboard__orders-td">
                          <AdminStatusBadge
                            label={STATUS_LABELS[order.status] ?? order.status}
                            color={statusColor(order.status)}
                          />
                        </td>
                        <td className="admin-dashboard__orders-td">
                          <div className="admin-dashboard__orders-actions">
                            <Link
                              to={`/admin/pedidos/${order.id}`}
                              className="admin-dashboard__view-btn"
                              aria-label={`Ver pedido ${order.orderNumber}`}
                            >
                              <Eye size={14} />
                            </Link>
                            <StatusDropdown
                              orderId={order.id}
                              current={order.status}
                              onUpdated={() =>
                                queryClient.invalidateQueries({
                                  queryKey: ["admin-dashboard"],
                                })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
