/**
 * AdminReportsPage — Sales reports, top products, CSV export.
 *
 * Data sources:
 *  - GET /api/admin/reports/daily-sales?from&to&period
 *  - GET /api/admin/reports/top-products?limit
 *  - GET /api/admin/reports/sales-by-type?from&to
 *  - GET /api/admin/reports/sales/csv?from&to
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Download,
  Loader2,
  TrendingUp,
  ShoppingBag,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import {
  getDailySales,
  getTopProducts,
  getSalesByProductType,
  downloadSalesCSV,
} from '../../services/api';
import { formatCOP } from '../../utils/format';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'quarter';
const PERIOD_LABELS: Record<Period, string> = { week: '7 días', month: '30 días', quarter: '90 días' };

const PIE_COLORS = ['#D81B60', '#F9A825', '#1E88E5', '#43A047', '#8E24AA', '#FF7043', '#78909C'];

function getDateRange(period: Period): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today);
  if (period === 'week') from.setDate(from.getDate() - 7);
  if (period === 'month') from.setDate(from.getDate() - 30);
  if (period === 'quarter') from.setDate(from.getDate() - 90);
  return { from: from.toISOString().slice(0, 10), to };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<Period>('week');
  const [downloading, setDownloading] = useState(false);

  const dateRange = getDateRange(period);

  const { data: salesRes, isLoading: salesLoading } = useQuery({
    queryKey: ['reports-daily-sales', period],
    queryFn: () => getDailySales({ ...dateRange, period }),
    staleTime: 2 * 60_000,
  });

  const { data: topRes, isLoading: topLoading } = useQuery({
    queryKey: ['reports-top-products'],
    queryFn: () => getTopProducts(10),
    staleTime: 5 * 60_000,
  });

  const { data: typeRes, isLoading: typeLoading } = useQuery({
    queryKey: ['reports-sales-by-type', period],
    queryFn: () => getSalesByProductType(dateRange),
    staleTime: 5 * 60_000,
  });

  const salesData = salesRes?.data;
  const labels: string[] = salesData?.labels ?? [];
  const values: number[] = salesData?.values ?? [];
  const chartData = labels.map((l, i) => ({ date: l, total: values[i] ?? 0 }));

  const topProducts: { name: string; revenue: number; quantity: number }[] = topRes?.data ?? [];
  const salesByType: { type: string; total: number }[] = typeRes?.data ?? [];

  const handleExportCSV = async () => {
    setDownloading(true);
    try {
      const res = await downloadSalesCSV(dateRange);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventas_${dateRange.from}_${dateRange.to}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Error al descargar el reporte.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary">Reportes</h1>
          <p className="text-sm text-muted">Ventas, productos y rendimiento</p>
        </div>
        <BarChart3 size={24} className="text-brand-pink" />
      </div>

      {/* Period selector + CSV export */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                period === key
                  ? 'bg-brand-pink text-white border-brand-pink'
                  : 'border-border text-muted hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExportCSV}
          disabled={downloading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          CSV
        </button>
      </div>

      {/* Sales trend chart */}
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-brand-pink" />
          <h2 className="font-heading font-semibold text-sm text-text-primary">Ventas Diarias</h2>
        </div>
        {salesLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-brand-pink" /></div>
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">Sin datos para este período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D81B60" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#D81B60" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCOP(v)} />
              <Tooltip formatter={(v: number) => formatCOP(v)} />
              <Area type="monotone" dataKey="total" stroke="#D81B60" fill="url(#salesGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-column: Top Products + Sales by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products bar chart */}
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag size={16} className="text-brand-gold" />
            <h2 className="font-heading font-semibold text-sm text-text-primary">Top 10 Productos</h2>
          </div>
          {topLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-brand-pink" /></div>
          ) : topProducts.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">Sin datos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCOP(v)} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                <Tooltip formatter={(v: number) => formatCOP(v)} />
                <Bar dataKey="revenue" fill="#D81B60" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sales by product type donut */}
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-blue-500" />
            <h2 className="font-heading font-semibold text-sm text-text-primary">Ventas por Tipo</h2>
          </div>
          {typeLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-brand-pink" /></div>
          ) : salesByType.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">Sin datos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={salesByType}
                  dataKey="total"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  label={({ type }: { type: string }) => type}
                >
                  {salesByType.map((_entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCOP(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
