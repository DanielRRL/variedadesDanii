/**
 * AdminDashboardPage — Main admin overview with bento-grid layout.
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  UserPlus,
  AlertTriangle,
  Eye,
  ChevronDown,
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
import { formatCOP } from "../../utils/format";
import { STATUS_LABELS, VALID_TRANSITIONS } from "./adminShared";
import AdminKpiCard from "../../components/admin/AdminKpiCard";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import AdminConfirmDialog from "../../components/admin/AdminConfirmDialog";
import { AdminSkeleton } from "../../components/admin/AdminSkeleton";
import type { AdminOrder } from "../../types";

// ─── Types ─────────────────────────────────────────────────────────────────

type Period = "today" | "week" | "month";
const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoy",
  week: "Semana",
  month: "Mes",
};

function getDateRange(period: Period): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today);
  if (period === "week") from.setDate(from.getDate() - 7);
  if (period === "month") from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to };
}

// ─── Chart color tokens ────────────────────────────────────────────────────

const CHART_PINK = "#D81B60";
const GRID_STROKE = "#E2E8F0";

const DONUT_COLORS = [
  "#D81B60",
  "#1565C0",
  "#F9A825",
  "#2E7D32",
  "#8E24AA",
  "#FF7043",
  "#26A69A",
];

// ─── Status dropdown for recent orders ─────────────────────────────────────

function StatusDropdown({
  orderId,
  current,
  onUpdated,
}: {
  orderId: string;
  current: string;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const next = VALID_TRANSITIONS[current] ?? [];
  if (next.length === 0) return null;

  const handleSelect = (status: string) => {
    if (status === "CANCELLED") {
      setOpen(false);
      setConfirmCancel(true);
      return;
    }
    executeTransition(status);
  };

  const executeTransition = async (status: string) => {
    setLoading(true);
    setOpen(false);
    try {
      await updateOrderStatus(orderId, status);
      onUpdated();
    } catch {
      alert("Error al actualizar el estado del pedido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          disabled={loading}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <span className="w-3 h-3 border border-t-transparent border-brand-pink rounded-full animate-spin" />
          ) : (
            <ChevronDown size={11} />
          )}
          Mover
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[150px] overflow-hidden">
              {next.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className={`w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50 transition-colors ${
                    s === "CANCELLED"
                      ? "text-red-600 font-medium"
                      : "text-slate-700"
                  }`}
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
        loading={loading}
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

// ─── Main page ─────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>("today");

  const { data: dashRes, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  });

  const { data: salesRes } = useQuery({
    queryKey: ["admin-sales-chart", period],
    queryFn: () => getDailySales(getDateRange(period)),
    staleTime: 2 * 60_000,
  });

  const { data: lowStockRes } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: () => getLowStockAlerts(),
    staleTime: 5 * 60_000,
  });

  const { data: gamifRes } = useQuery({
    queryKey: ["admin-gamification-stats"],
    queryFn: getGamificationStats,
    staleTime: 5 * 60_000,
  });

  const { data: salesTypeRes } = useQuery({
    queryKey: ["admin-sales-by-type", period],
    queryFn: () => getSalesByProductType(getDateRange(period)),
    staleTime: 5 * 60_000,
  });

  const { data: redemptionsRes } = useQuery({
    queryKey: ["admin-pending-redemptions-dash"],
    queryFn: () => adminGetPendingRedemptions(1),
    staleTime: 60_000,
  });

  const stats = dashRes?.data ?? {};

  const salesToday = stats.salesToday ?? 0;
  const salesGoal = stats.salesGoal ?? 1_000_000;
  const salesPct = stats.salesPercent ?? Math.round(
    (salesToday / Math.max(1, salesGoal)) * 100
  );
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
    (salesTypeRes?.data as { types?: { name: string; value: number }[] } | undefined)
      ?.types ?? [];

  const chartLabels: string[] = salesRes?.data?.labels ?? [];
  const chartValues: number[] = salesRes?.data?.values ?? [];
  const chartData = chartLabels.map((time, i) => ({
    time,
    amount: chartValues[i] ?? 0,
  }));

  const lowStockList: { name: string; stockMl: number }[] =
    lowStockRes?.data?.essences ?? lowStockRes?.data ?? [];

  const topEssenceData = topEssences.slice(0, 5).map((ess) => ({
    name: ess.name.length > 18 ? ess.name.slice(0, 16) + "…" : ess.name,
    revenue: ess.revenue,
  }));

  // ─── Loading skeleton ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminSkeleton.Card />
          <AdminSkeleton.Card />
          <AdminSkeleton.Card />
          <AdminSkeleton.Card />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <AdminSkeleton.Card />
          <AdminSkeleton.Card />
          <AdminSkeleton.Card />
        </div>
        <AdminSkeleton.Chart />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ── Alert cards (compact, inline) ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {lowStockList.length > 0 && (
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <p className="text-[13px] text-amber-800">
              <span className="font-semibold">Stock bajo</span>{" "}
              en {lowStockList.length} esencia
              {lowStockList.length > 1 ? "s" : ""}:{" "}
              {lowStockList.slice(0, 2).map((e) => e.name).join(", ")}
              {lowStockList.length > 2
                ? ` y ${lowStockList.length - 2} más`
                : ""}
              .
            </p>
            <Link
              to="/admin/inventario"
              className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 underline whitespace-nowrap shrink-0 ml-1"
            >
              Ver inventario
            </Link>
          </div>
        )}

        {pendingRedemptions > 0 && (
          <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5">
            <Gift size={16} className="text-purple-600 shrink-0" />
            <p className="text-[13px] text-purple-800">
              <span className="font-semibold">
                {pendingRedemptions} canje
                {pendingRedemptions > 1 ? "s" : ""} pendiente
                {pendingRedemptions > 1 ? "s" : ""}
              </span>{" "}
              de entrega.
            </p>
            <Link
              to="/admin/canjes"
              className="text-[11px] font-semibold text-purple-700 hover:text-purple-800 underline whitespace-nowrap shrink-0 ml-1"
            >
              Gestionar
            </Link>
          </div>
        )}
      </div>

      {/* ── KPI row — commerce ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKpiCard
          icon={TrendingUp}
          label="Ventas Hoy"
          value={formatCOP(salesToday)}
          accent
          progress={{ pct: salesPct }}
        />
        <AdminKpiCard
          icon={ShoppingBag}
          label="Pedidos Hoy"
          value={String(ordersToday)}
          trend={{
            value: vsYesterday,
            label: "vs ayer",
          }}
        />
        <AdminKpiCard
          icon={CreditCard}
          label="Ticket Promedio"
          value={formatCOP(avgTicket)}
          sub="Basado en pedidos de hoy"
        />
        <AdminKpiCard
          icon={UserPlus}
          label="Clientes Nuevos"
          value={String(newClients)}
          sub="Registrados hoy"
        />
      </div>

      {/* ── KPI row — gamification ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <AdminKpiCard
          icon={Gem}
          label="Gramos Emitidos"
          value={`${gramsIssued}g`}
          sub="Total acumulado"
        />
        <AdminKpiCard
          icon={Gift}
          label="Canjes Pendientes"
          value={String(pendingRedemptions)}
          sub="Esperando entrega"
          accent={pendingRedemptions > 0}
        />
        <AdminKpiCard
          icon={Clock}
          label="Fichas Activas"
          value={String(activeTokens)}
          sub="Sin jugar aún"
        />
      </div>

      {/* ── Sales chart + Top 5 essences ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-slate-800 text-sm">
              Ventas por período
            </h2>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    period === p
                      ? "bg-white text-brand-pink shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-[13px] text-slate-400">
              Sin datos para este período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_PINK} stopOpacity={0.18} />
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
                  tickFormatter={(v: number) => `$${(v / 1_000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
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
                  strokeWidth={2}
                  fill="url(#pinkGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_PINK }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 5 essences — horizontal bar chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-heading font-semibold text-slate-800 text-sm mb-4">
            Top 5 Esencias hoy
          </h2>
          {topEssenceData.length === 0 ? (
            <p className="text-[13px] text-slate-400">Sin ventas registradas hoy.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
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
                  tickFormatter={(v: number) => `$${(v / 1_000).toFixed(0)}k`}
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
                  fill={CHART_PINK}
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Sales by product type donut ────────────────────────────────────── */}
      {salesByType.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-heading font-semibold text-slate-800 text-sm mb-2">
            Ventas por tipo de producto
          </h2>
          <ResponsiveContainer width="100%" height={240}>
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
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
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
      )}

      {/* ── Recent orders table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-slate-800 text-sm">
            Pedidos Recientes
          </h2>
          <Link
            to="/admin/pedidos"
            className="text-[11px] text-brand-blue font-semibold hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["PEDIDO #", "CLIENTE", "ESENCIAS", "TOTAL", "ESTADO", "ACCIONES"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold text-slate-500 uppercase tracking-wider text-[11px]"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-[13px]">
                    Sin pedidos registrados hoy.
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
                  const essenceList =
                    order.items
                      ?.map(
                        (it) =>
                          it.product?.essence?.name ?? it.product?.name ?? ""
                      )
                      .filter(Boolean)
                      .join(", ") ?? "—";

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-brand-blue font-semibold text-[11px]">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-pink/15 flex items-center justify-center shrink-0">
                            <span className="text-brand-pink font-bold text-[10px]">
                              {initials}
                            </span>
                          </div>
                          <span className="font-medium text-slate-700 truncate max-w-[120px]">
                            {order.client?.name ?? "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-500 truncate max-w-[180px] block">
                          {essenceList}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {formatCOP(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <AdminStatusBadge
                          label={STATUS_LABELS[order.status] ?? order.status}
                          color={statusColor(order.status)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/pedidos/${order.id}`}
                            className="p-1.5 text-slate-400 hover:text-brand-blue rounded-lg hover:bg-blue-50 transition-colors"
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
  );
}
