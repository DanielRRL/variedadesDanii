/**
 * AdminDashboardPage.tsx — Main admin overview.
 *
 * Data sources:
 *  - GET /api/admin/dashboard          → KPI cards + recent orders + top essences
 *  - GET /api/admin/reports/daily-sales → AreaChart (refreshes on period change)
 *  - GET /api/admin/reports/low-stock   → orange alert banner
 *
 * Auto-refreshes every 30 seconds. Status changes invalidate the dashboard query.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  UserPlus,
  AlertTriangle,
  Eye,
  ChevronDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import {
  getDashboardStats,
  getDailySales,
  getLowStockAlerts,
  updateOrderStatus,
} from '../../services/api';
import { formatCOP } from '../../components/catalog/EssenceCard';
import { STATUS_LABELS, STATUS_COLORS, VALID_TRANSITIONS } from './adminShared';
import type { AdminOrder } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month';
const PERIOD_LABELS: Record<Period, string> = { today: 'Hoy', week: 'Semana', month: 'Mes' };

function getDateRange(period: Period): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today);
  if (period === 'week')  from.setDate(from.getDate() - 7);
  if (period === 'month') from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to };
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI card
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
  progress,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  progress?: { pct: number };
}) {
  const barColor =
    !progress
      ? ''
      : progress.pct >= 80
      ? 'bg-green-500'
      : progress.pct >= 50
      ? 'bg-yellow-400'
      : 'bg-red-400';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg ${accent ? 'bg-brand-pink/10' : 'bg-gray-100'}`}>
          <Icon size={15} className={accent ? 'text-brand-pink' : 'text-muted'} />
        </div>
      </div>
      <p className="font-heading font-bold text-2xl text-text-primary leading-none">{value}</p>
      {progress && (
        <div className="space-y-1">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(100, progress.pct)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted">{progress.pct.toFixed(1)}% de la meta diaria</p>
        </div>
      )}
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status dropdown for order row transitions
// ─────────────────────────────────────────────────────────────────────────────

function StatusDropdown({
  orderId,
  current,
  onUpdated,
}: {
  orderId: string;
  current: string;
  onUpdated: () => void;
}) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const next = VALID_TRANSITIONS[current] ?? [];
  if (next.length === 0) return null;

  const handleSelect = async (status: string) => {
    if (status === 'CANCELLED' && !window.confirm('¿Confirmas cancelar este pedido?')) return;
    setLoading(true);
    setOpen(false);
    try {
      await updateOrderStatus(orderId, status);
      onUpdated();
    } catch {
      alert('Error al actualizar el estado del pedido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        disabled={loading}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {loading
          ? <span className="w-3 h-3 border border-t-transparent border-brand-pink rounded-full animate-spin" />
          : <ChevronDown size={11} />}
        Mover
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-20 min-w-37.5 overflow-hidden">
            {next.map((s) => (
              <button
                key={s}
                onClick={() => handleSelect(s)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                  s === 'CANCELLED' ? 'text-red-500 font-medium' : 'text-text-primary'
                }`}
              >
                {STATUS_LABELS[s] ?? s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>('today');

  const { data: dashRes, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  });

  const { data: salesRes } = useQuery({
    queryKey: ['admin-sales-chart', period],
    queryFn: () => getDailySales(getDateRange(period)),
    staleTime: 2 * 60_000,
  });

  const { data: lowStockRes } = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: () => getLowStockAlerts(),
    staleTime: 5 * 60_000,
  });

  const stats = dashRes?.data ?? {};

  const salesToday: number  = stats.salesToday  ?? 0;
  const salesGoal: number   = stats.salesGoal   ?? 1_000_000;
  const salesPct: number    = stats.salesPercent ?? Math.round((salesToday / Math.max(1, salesGoal)) * 100);
  const ordersToday: number = stats.ordersToday  ?? 0;
  const vsYesterday: number = stats.ordersTodayVsYesterday ?? 0;
  const avgTicket: number   = stats.averageTicket   ?? 0;
  const newClients: number  = stats.newClientsToday ?? 0;

  const topEssences: { name: string; revenue: number; rank: number }[] = stats.topEssences ?? [];
  const recentOrders: AdminOrder[] = stats.recentOrders ?? [];

  const chartLabels: string[] = salesRes?.data?.labels ?? [];
  const chartValues: number[] = salesRes?.data?.values ?? [];
  const chartData = chartLabels.map((time: string, i: number) => ({
    time,
    amount: chartValues[i] ?? 0,
  }));

  const lowStockList: { name: string; stockMl: number }[] =
    lowStockRes?.data?.essences ?? lowStockRes?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Low-stock alert banner */}
      {lowStockList.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={17} className="text-orange-500 mt-0.5 shrink-0" />
          <p className="text-sm text-orange-800 flex-1">
            <span className="font-semibold">Stock bajo</span>{' '}
            en {lowStockList.length} esencia{lowStockList.length > 1 ? 's' : ''}:{' '}
            {lowStockList.map((e) => e.name).join(', ')}.
          </p>
          <Link to="/admin/inventario" className="text-xs font-semibold text-orange-700 underline whitespace-nowrap shrink-0">
            Ver inventario
          </Link>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} label="Ventas Hoy"     value={formatCOP(salesToday)} accent progress={{ pct: salesPct }} />
        <KpiCard icon={ShoppingBag} label="Pedidos Hoy"   value={String(ordersToday)}
          sub={vsYesterday !== 0 ? `${vsYesterday >= 0 ? '▲' : '▼'} ${Math.abs(vsYesterday)}% vs ayer` : undefined} />
        <KpiCard icon={CreditCard}  label="Ticket Promedio" value={formatCOP(avgTicket)}  sub="Basado en pedidos de hoy" />
        <KpiCard icon={UserPlus}    label="Clientes Nuevos" value={String(newClients)}    sub="Registrados hoy" />
      </div>

      {/* Sales chart + Top essences */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-text-primary text-sm">Ventas por período</h2>
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    period === p ? 'bg-white text-brand-pink shadow-sm' : 'text-muted hover:text-text-primary'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted text-sm">
              Sin datos para este período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#D81B60" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#D81B60" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEEEEE" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#757575' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v: number) => `$${(v / 1_000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: '#757575' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(v: unknown) => [formatCOP(v as number), 'Ventas']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E0E0E0' }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#D81B60"
                  strokeWidth={2}
                  fill="url(#pinkGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#D81B60' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 5 essences */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-5">
          <h2 className="font-heading font-semibold text-text-primary text-sm mb-4">Top 5 Esencias hoy</h2>
          {topEssences.length === 0 ? (
            <p className="text-muted text-sm">Sin ventas registradas hoy.</p>
          ) : (
            <div className="space-y-3">
              {topEssences.slice(0, 5).map((ess, i) => {
                const maxRev = topEssences[0]?.revenue ?? 1;
                const pct    = Math.round((ess.revenue / Math.max(1, maxRev)) * 100);
                return (
                  <div key={ess.name} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-pink/10 flex items-center justify-center shrink-0">
                      <span className="text-brand-pink font-bold text-[10px]">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{ess.name}</p>
                      <div className="h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-brand-pink rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-text-primary shrink-0">
                      {formatCOP(ess.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-heading font-semibold text-text-primary text-sm">Pedidos Recientes</h2>
          <Link to="/admin/pedidos" className="text-xs text-brand-blue font-semibold hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                {['PEDIDO #', 'CLIENTE', 'ESENCIAS', 'TOTAL', 'ESTADO', 'ACCIONES'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-muted uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">Sin pedidos registrados hoy.</td>
                </tr>
              ) : (
                recentOrders.map((order) => {
                  const initials =
                    order.client?.name?.split(' ').slice(0, 2).map((w) => w[0]).join('') ?? '?';
                  const essenceList =
                    order.items
                      ?.map((it) => it.product?.essence?.name ?? it.product?.name ?? '')
                      .filter(Boolean)
                      .join(', ') ?? '—';
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-brand-blue font-semibold">{order.orderNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-brand-pink/20 flex items-center justify-center shrink-0">
                            <span className="text-brand-pink font-bold text-[9px]">{initials}</span>
                          </div>
                          <span className="font-medium text-text-primary truncate max-w-30">
                            {order.client?.name ?? 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted truncate max-w-45 block">{essenceList}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-text-primary">
                        {formatCOP(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/admin/pedidos/${order.id}`} className="p-1.5 text-muted hover:text-brand-blue rounded-lg hover:bg-blue-50 transition-colors" aria-label="Ver pedido">
                            <Eye size={14} />
                          </Link>
                          <StatusDropdown
                            orderId={order.id}
                            current={order.status}
                            onUpdated={() => queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })}
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
