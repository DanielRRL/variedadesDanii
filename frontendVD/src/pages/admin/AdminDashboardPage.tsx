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
} from "../../services/api";
import { formatCOP, formatCOPSplit } from "../../utils/format";
import { cn } from "../../utils/cn";
import { STATUS_LABELS, VALID_TRANSITIONS } from "./adminShared";
import AdminKpiCard from "../../components/admin/AdminKpiCard";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import AdminConfirmDialog from "../../components/admin/AdminConfirmDialog";
import { AdminSkeleton } from "../../components/admin/AdminSkeleton";
import { AdminQueryError } from "../../components/admin/AdminQueryError";
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
      <div className="relative">
        <button
          disabled={mutation.isPending}
          onClick={() => setOpen((v) => !v)}
          className="p-1.5 text-slate-300 hover:text-slate-600 rounded transition-colors disabled:opacity-50"
          aria-label="Cambiar estado"
        >
          {mutation.isPending ? (
            <span className="block w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin" />
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
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[150px] overflow-hidden">
              {next.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    s === "CANCELLED"
                      ? (setOpen(false), setConfirmCancel(true))
                      : executeTransition(s)
                  }
                  className={cn(
                    "w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 transition-colors",
                    s === "CANCELLED"
                      ? "text-red-600 font-medium"
                      : "text-slate-700",
                  )}
                >
                  {STATUS_LABELS[s] ?? s}
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
        "font-display text-base text-slate-800 tracking-tight mb-4",
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
    <div className="flex border-b border-slate-200 w-full sm:w-auto">
      {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "flex-1 sm:flex-none px-3 py-2 text-[11px] font-medium transition-colors border-b-2 -mb-[1px]",
            period === p
              ? "border-brand-pink text-brand-pink"
              : "border-transparent text-slate-400 hover:text-brand-pink/70",
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
  const [period, setPeriod] = useState<Period>("today");

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
      <div className="relative">
        <div className="admin-dashboard-bg" aria-hidden="true">
          <div className="admin-dashboard-blob admin-dashboard-blob--1" />
          <div className="admin-dashboard-blob admin-dashboard-blob--2" />
          <div className="admin-dashboard-blob admin-dashboard-blob--3" />
        </div>
        <div className="relative z-[1] space-y-14 lg:space-y-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <AdminSkeleton.Card />
            <AdminSkeleton.Card />
            <AdminSkeleton.Card />
            <AdminSkeleton.Card />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
      <div className="relative">
        <div className="admin-dashboard-bg" aria-hidden="true">
          <div className="admin-dashboard-blob admin-dashboard-blob--1" />
          <div className="admin-dashboard-blob admin-dashboard-blob--2" />
          <div className="admin-dashboard-blob admin-dashboard-blob--3" />
        </div>
        <div className="relative z-[1] space-y-14 lg:space-y-20 max-w-7xl mx-auto">
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
    <div className="relative">
      {/* ── Background decorative blobs ──────────────────────────────────── */}
      <div className="admin-dashboard-bg" aria-hidden="true">
        <div className="admin-dashboard-blob admin-dashboard-blob--1" />
        <div className="admin-dashboard-blob admin-dashboard-blob--2" />
        <div className="admin-dashboard-blob admin-dashboard-blob--3" />
      </div>

      <div className="relative z-[1] space-y-14 lg:space-y-20 max-w-7xl mx-auto pb-6 sm:pb-10">
        {/* ── Alert cards ────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          {lowStockError && (
            <div className="flex items-center gap-2 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-lg px-4 py-3 w-full sm:w-auto min-h-[40px]">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <p className="text-[11px] sm:text-[12px] text-red-700">
                Error al cargar alertas de stock.
              </p>
            </div>
          )}
          {!lowStockError && lowStockList.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-lg px-4 py-3 w-full sm:w-auto min-h-[40px]">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <p className="text-[11px] sm:text-[12px] text-amber-700 truncate">
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
                className="text-[10px] font-medium text-amber-600 underline whitespace-nowrap shrink-0 ml-auto sm:ml-1"
              >
                Ver
              </Link>
            </div>
          )}

          {redemptionsError && (
            <div className="flex items-center gap-2 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-lg px-4 py-3 w-full sm:w-auto min-h-[40px]">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <p className="text-[11px] sm:text-[12px] text-red-700">
                Error al cargar canjes pendientes.
              </p>
            </div>
          )}
          {!redemptionsError && pendingRedemptions > 0 && (
            <div className="flex items-center gap-2 bg-purple-50/80 backdrop-blur-sm border border-purple-200/50 rounded-lg px-4 py-3 w-full sm:w-auto min-h-[40px]">
              <Gift size={14} className="text-purple-500 shrink-0" />
              <p className="text-[11px] sm:text-[12px] text-purple-700">
                <span className="font-semibold">
                  {pendingRedemptions} canje
                  {pendingRedemptions > 1 ? "s" : ""} pendiente
                  {pendingRedemptions > 1 ? "s" : ""}
                </span>
              </p>
              <Link
                to="/admin/canjes"
                className="text-[10px] font-medium text-purple-600 underline whitespace-nowrap shrink-0 ml-auto sm:ml-1"
              >
                Gestionar
              </Link>
            </div>
          )}
        </div>

        {/* ── Commerce KPIs ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-item stagger-1">
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

        {/* ── Gamification ───────────────────────────────────────────────── */}
        {gamifError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-[13px] text-red-700">
              Error al cargar estadísticas de gamificación.
            </p>
          </div>
        ) : (
          <div className="bg-brand-gold/5 backdrop-blur-sm rounded-2xl border border-brand-gold/20 p-8 lg:p-10 stagger-item stagger-2">
            <p className="font-display text-sm text-brand-gold/80 mb-4 tracking-tight">
              Gamificación
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
          </div>
        )}

        {/* ── Sales chart + Top 5 essences ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-8 lg:p-10 shadow-card stagger-item stagger-3 hover:shadow-md transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <PageSectionHeading className="mb-0">
                Ventas por período
              </PageSectionHeading>
              <PeriodToggle period={period} onChange={setPeriod} />
            </div>

            {salesError ? (
              <div className="h-48 flex items-center justify-center text-[13px] text-red-500">
                Error al cargar datos de ventas.
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-[13px] text-slate-400">
                Sin datos para este período
              </div>
            ) : (
              <div className="mt-2">
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

          <div className="bg-white rounded-xl border border-slate-100 p-8 lg:p-10 shadow-card stagger-item stagger-4 hover:shadow-md transition-shadow duration-300">
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-[13px] text-red-700">
              Error al cargar ventas por tipo de producto.
            </p>
          </div>
        ) : (
          salesByType.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 p-8 lg:p-10 shadow-card stagger-item stagger-5 hover:shadow-md transition-shadow duration-300">
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
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-card stagger-item stagger-6">
          <div className="px-6 lg:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
            <PageSectionHeading className="mb-0">
              Pedidos Recientes
            </PageSectionHeading>
            <Link
              to="/admin/pedidos"
              className="text-[11px] text-slate-400 hover:text-slate-900 font-medium transition-colors"
            >
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200">
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
                        "px-6 lg:px-8 py-4 text-left font-medium text-slate-400 uppercase text-[10px] tracking-[0.15em] whitespace-nowrap",
                        col.hide === "md" ? "hidden md:table-cell" : "",
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 lg:px-8 py-28 sm:py-36 text-center align-middle"
                    >
                      <div className="flex flex-col items-center gap-4 mx-auto">
                        <div className="relative w-[72px] h-[72px] rounded-2xl bg-brand-pink/6 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(216,27,96,0.08),0_4px_16px_rgba(216,27,96,0.08)]">
                          <div className="absolute inset-[-6px] rounded-[1.125rem] border-2 border-brand-pink/8 animate-pulse-ring pointer-events-none" />
                          <ShoppingBag size={28} className="text-brand-pink/40" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="font-display text-base text-slate-800">
                            Sin pedidos aún
                          </p>
                          <p className="text-[13px] text-slate-400 mt-1">
                            Los pedidos del día aparecerán aquí.
                          </p>
                        </div>
                        <Link
                          to="/admin/pedidos"
                          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white text-[13px] font-semibold shadow-[0_4px_16px_rgba(216,27,96,0.25)] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(216,27,96,0.35)] transition-all duration-300"
                        >
                          <Eye size={14} />
                          Ver pedidos anteriores
                        </Link>
                      </div>
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
                          (it) =>
                            it.product?.essence?.name ?? it.product?.name ?? "",
                        )
                        .filter(Boolean) ?? [];

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 lg:px-8 py-5 align-middle">
                          <span className="font-mono text-slate-900 font-medium text-[11px]">
                            {order.orderNumber}
                          </span>
                        </td>
                        <td className="px-6 lg:px-8 py-5 align-middle hidden md:table-cell">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-sm bg-slate-900 flex items-center justify-center shrink-0">
                              <span className="text-white font-medium text-[10px]">
                                {initials}
                              </span>
                            </div>
                            <span className="font-medium text-slate-700 truncate max-w-[120px] text-[13px]">
                              {order.client?.name ?? "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 lg:px-8 py-5 align-middle hidden md:table-cell">
                          <div className="flex flex-wrap gap-1.5">
                            {essenceItems.slice(0, 3).map((name, i) => (
                              <span
                                key={i}
                                className="bg-slate-100 px-2.5 py-1 rounded-full text-[11px] text-slate-600 whitespace-nowrap truncate max-w-[120px]"
                              >
                                {name}
                              </span>
                            ))}
                            {essenceItems.length > 3 && (
                              <span className="text-[10px] text-slate-400 self-center">
                                +{essenceItems.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 lg:px-8 py-5 align-middle font-medium text-slate-800">
                          {formatCOP(order.total)}
                        </td>
                        <td className="px-6 lg:px-8 py-5 align-middle">
                          <AdminStatusBadge
                            label={STATUS_LABELS[order.status] ?? order.status}
                            color={statusColor(order.status)}
                          />
                        </td>
                        <td className="px-6 lg:px-8 py-5 align-middle">
                          <div className="flex items-center gap-1">
                            <Link
                              to={`/admin/pedidos/${order.id}`}
                              className="hidden sm:inline-flex p-1.5 text-slate-300 hover:text-slate-600 rounded transition-colors"
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
