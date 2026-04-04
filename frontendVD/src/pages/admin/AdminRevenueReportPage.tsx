/**
 * AdminRevenueReportPage.tsx — Revenue report with channel breakdown,
 * bar chart, top products, and paginated sales history.
 *
 * Route: /admin/ganancias
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  ShoppingCart,
  Store,
  TrendingUp,
  Calendar,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { getRevenueSummary, getPOSSales, downloadSalesCSV } from '../../services/api';
import { formatCOP } from '../../utils/format';
import { STATUS_LABELS, STATUS_COLORS } from './adminShared';
import type { RevenueSummary, Order } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

type Period = 'today' | 'week' | 'month' | 'custom';

// ─────────────────────────────────────────────────────────────────────────────
// MetricCard
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="text-lg font-bold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopProductsTable
// ─────────────────────────────────────────────────────────────────────────────

function TopProductsTable({
  title,
  products,
}: {
  title: string;
  products: { name: string; quantity: number; revenue: number }[];
}) {
  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-heading text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      {products.length === 0 ? (
        <p className="text-center text-muted text-sm py-6">Sin datos</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-muted">
              <th className="text-left px-4 py-2">#</th>
              <th className="text-left px-4 py-2">Producto</th>
              <th className="text-right px-4 py-2">Uds.</th>
              <th className="text-right px-4 py-2">Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {products.slice(0, 5).map((p, i) => (
              <tr key={p.name} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-muted">{i + 1}</td>
                <td className="px-4 py-2 text-text-primary font-medium truncate max-w-[180px]">
                  {p.name}
                </td>
                <td className="px-4 py-2 text-right text-muted">{p.quantity}</td>
                <td className="px-4 py-2 text-right font-semibold text-brand-gold">
                  {formatCOP(p.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminRevenueReportPage
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminRevenueReportPage() {
  // ── Period filters ──
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState(daysAgo(30));
  const [customTo, setCustomTo] = useState(todayISO());

  const { from, to } = useMemo(() => {
    switch (period) {
      case 'today':
        return { from: todayISO(), to: todayISO() };
      case 'week':
        return { from: startOfWeek(), to: todayISO() };
      case 'month':
        return { from: startOfMonth(), to: todayISO() };
      case 'custom':
        return { from: customFrom, to: customTo };
    }
  }, [period, customFrom, customTo]);

  // ── Sales history pagination ──
  const [salesPage, setSalesPage] = useState(1);

  // ── Queries ──
  const { data: revenueRes, isLoading: loadingRevenue } = useQuery({
    queryKey: ['pos-revenue', from, to],
    queryFn: () => getRevenueSummary({ from, to }),
  });

  const revenue = (revenueRes?.data ?? null) as RevenueSummary | null;

  const { data: salesRes, isLoading: loadingSales } = useQuery({
    queryKey: ['pos-sales-history', from, to, salesPage],
    queryFn: () => getPOSSales({ from, to, page: salesPage, limit: 20 }),
  });

  const salesData = salesRes?.data as { data?: Order[]; orders?: Order[]; total?: number } | Order[] | undefined;
  const salesList: Order[] = Array.isArray(salesData)
    ? salesData
    : (salesData?.data ?? salesData?.orders ?? []);
  const salesTotal: number = Array.isArray(salesData) ? salesData.length : (salesData?.total ?? 0);

  // ── Chart data (from revenue summary — simplistic daily breakdown is not available,
  //    so we show channel-level bars) ──
  const chartData = useMemo(() => {
    if (!revenue) return [];
    return [
      {
        name: 'E-commerce',
        ecommerce: revenue.totalEcommerce,
        pos: 0,
      },
      {
        name: 'Punto de Venta',
        ecommerce: 0,
        pos: revenue.totalInStore,
      },
    ];
  }, [revenue]);

  const totalOrders = (revenue?.orderCountEcommerce ?? 0) + (revenue?.orderCountInStore ?? 0);
  const averageTicket = totalOrders > 0 ? (revenue?.totalGeneral ?? 0) / totalOrders : 0;

  // ── CSV export ──
  const handleExportCSV = useCallback(async () => {
    try {
      const res = await downloadSalesCSV({ from, to });
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventas_${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — user can retry
    }
  }, [from, to]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-heading text-lg font-bold text-text-primary">Reporte de Ganancias</h1>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
        >
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* Period selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1.5 flex-wrap">
          {(
            [
              { key: 'today', label: 'Hoy' },
              { key: 'week', label: 'Esta semana' },
              { key: 'month', label: 'Este mes' },
              { key: 'custom', label: 'Personalizado' },
            ] as const
          ).map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p.key
                  ? 'bg-brand-pink text-white'
                  : 'bg-white border border-border text-muted hover:border-brand-pink/40'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Calendar size={14} className="text-muted" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
              />
            </div>
            <span className="text-xs text-muted">—</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
            />
          </div>
        )}
      </div>

      {/* Loading */}
      {loadingRevenue ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-brand-pink" size={28} />
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              icon={DollarSign}
              label="Total General"
              value={formatCOP(revenue?.totalGeneral ?? 0)}
              color="bg-green-100 text-green-700"
            />
            <MetricCard
              icon={ShoppingCart}
              label="E-commerce"
              value={formatCOP(revenue?.totalEcommerce ?? 0)}
              color="bg-blue-100 text-blue-700"
            />
            <MetricCard
              icon={Store}
              label="Punto de Venta"
              value={formatCOP(revenue?.totalInStore ?? 0)}
              color="bg-pink-100 text-brand-pink"
            />
            <MetricCard
              icon={TrendingUp}
              label="Promedio / venta"
              value={formatCOP(averageTicket)}
              color="bg-amber-100 text-amber-700"
            />
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-xl border border-border p-4">
            <h3 className="font-heading text-sm font-semibold text-text-primary mb-4">
              Ingresos por canal
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCOP(Number(v))} />
                <Tooltip formatter={(v) => formatCOP(Number(v))} />
                <Legend />
                <Bar dataKey="ecommerce" name="E-commerce" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pos" name="Punto de Venta" fill="#D81B60" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopProductsTable
              title="Top E-commerce"
              products={revenue?.topProductsEcommerce ?? []}
            />
            <TopProductsTable
              title="Top Punto de Venta"
              products={revenue?.topProductsInStore ?? []}
            />
          </div>
        </>
      )}

      {/* Sales history table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold text-text-primary">
            Historial de ventas
          </h3>
          <span className="text-xs text-muted">{salesTotal} registros</span>
        </div>

        {loadingSales ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-brand-pink" size={22} />
          </div>
        ) : salesList.length === 0 ? (
          <p className="text-center text-muted text-sm py-8">Sin ventas en este período</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-muted">
                    <th className="text-left px-4 py-2">Fecha/Hora</th>
                    <th className="text-left px-4 py-2"># Factura</th>
                    <th className="text-left px-4 py-2">Canal</th>
                    <th className="text-left px-4 py-2">Productos</th>
                    <th className="text-right px-4 py-2">Total</th>
                    <th className="text-center px-4 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {salesList.map((order) => {
                    const isInStore = (order as Order & { saleChannel?: string }).saleChannel === 'IN_STORE';
                    return (
                      <tr key={order.id} className="border-t border-border hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted">
                          {new Date(order.createdAt).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-text-primary">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              isInStore
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {isInStore ? 'LOCAL' : 'ONLINE'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted max-w-[200px] truncate">
                          {order.items?.map((i) => i.product?.name).filter(Boolean).join(', ') ||
                            `${order.items?.length ?? 0} productos`}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-brand-gold">
                          {formatCOP(order.total)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {salesTotal > 20 && (
              <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-border">
                <button
                  disabled={salesPage <= 1}
                  onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-border hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-muted">
                  Página {salesPage} de {Math.ceil(salesTotal / 20)}
                </span>
                <button
                  disabled={salesPage >= Math.ceil(salesTotal / 20)}
                  onClick={() => setSalesPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-border hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
