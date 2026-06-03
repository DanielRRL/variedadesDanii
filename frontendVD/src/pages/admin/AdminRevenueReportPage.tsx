/**
 * AdminRevenueReportPage.tsx — Revenue report with channel breakdown,
 * bar chart, top products, and paginated sales history.
 *
 * Route: /admin/ganancias
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminQueryError } from '../../components/admin/AdminQueryError';
import {
  DollarSign, ShoppingCart, Store, TrendingUp, Calendar,
  Download, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';
import { getRevenueSummary, getPOSSales, downloadSalesCSV } from '../../services/api';
import { formatCOP } from '../../utils/format';
import { STATUS_LABELS } from './adminShared';
import type { RevenueSummary, Order } from '../../types';
import '../../css/AdminRevenueReportPage.css';

function todayISO() { return new Date().toISOString().slice(0, 10); }
function tomorrowISO() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function startOfWeek() { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toISOString().slice(0, 10); }
function startOfMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }

type Period = 'today' | 'week' | 'month' | 'custom';

function MetricCard({ icon: Icon, label, value, color }: { icon: typeof DollarSign; label: string; value: string; color: string }) {
  return (
    <div className="admin-revenue__metric-card">
      <div className={clsx('admin-revenue__metric-icon', `admin-revenue__metric-icon--${color}`)}>
        <Icon size={20} />
      </div>
      <div className="admin-revenue__metric-info">
        <p className="admin-revenue__metric-label">{label}</p>
        <p className="admin-revenue__metric-value">{value}</p>
      </div>
    </div>
  );
}

function TopProductsTable({ title, products }: { title: string; products: { name: string; quantity: number; revenue: number }[] }) {
  return (
    <div className="admin-revenue__top-card">
      <div className="admin-revenue__top-header">{title}</div>
      {products.length === 0 ? (
        <p className="admin-revenue__top-empty">Sin datos</p>
      ) : (
        <table className="admin-revenue__top-table">
          <thead><tr>
            <th className="admin-revenue__top-th">#</th>
            <th className="admin-revenue__top-th">Producto</th>
            <th className="admin-revenue__top-th" style={{ textAlign: 'right' }}>Uds.</th>
            <th className="admin-revenue__top-th" style={{ textAlign: 'right' }}>Ingresos</th>
          </tr></thead>
          <tbody>
            {products.slice(0, 5).map((p, i) => (
              <tr key={p.name} className="admin-revenue__top-tr">
                <td className="admin-revenue__top-td"><span className="admin-revenue__top-td-rank">{i + 1}</span></td>
                <td className="admin-revenue__top-td"><span className="admin-revenue__top-td-name">{p.name}</span></td>
                <td className="admin-revenue__top-td" style={{ textAlign: 'right' }}><span className="admin-revenue__top-td-qty">{p.quantity}</span></td>
                <td className="admin-revenue__top-td" style={{ textAlign: 'right' }}><span className="admin-revenue__top-td-revenue">{formatCOP(p.revenue)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminRevenueReportPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState(daysAgo(30));
  const [customTo, setCustomTo] = useState(todayISO());
  const [salesPage, setSalesPage] = useState(1);

  const { from, to } = useMemo(() => {
    switch (period) {
      case 'today': return { from: todayISO(), to: tomorrowISO() };
      case 'week': return { from: startOfWeek(), to: tomorrowISO() };
      case 'month': return { from: startOfMonth(), to: tomorrowISO() };
      case 'custom': return { from: customFrom, to: customTo };
    }
  }, [period, customFrom, customTo]);

  const { data: revenueRes, isLoading: loadingRevenue, isError: isRevenueError } = useQuery({
    queryKey: ['pos-revenue', from, to], queryFn: () => getRevenueSummary({ from, to }),
  });
  const revenue = (revenueRes?.data ?? null) as RevenueSummary | null;

  const { data: salesRes, isLoading: loadingSales, isError: isSalesError } = useQuery({
    queryKey: ['pos-sales-history', from, to, salesPage],
    queryFn: () => getPOSSales({ from, to, page: salesPage, limit: 20 }),
  });

  const chartData = useMemo(() => {
    if (!revenue) return [];
    return [
      { name: 'E-commerce', ecommerce: revenue.totalEcommerce, pos: 0 },
      { name: 'Punto de Venta', ecommerce: 0, pos: revenue.totalInStore },
    ];
  }, [revenue]);

  const handleExportCSV = useCallback(async () => {
    try {
      const res = await downloadSalesCSV({ from, to });
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `ventas_${from}_${to}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* silently fail */ }
  }, [from, to]);

  if (isRevenueError || isSalesError) return <AdminQueryError />;

  const salesData = salesRes?.data as { data?: Order[]; orders?: Order[]; total?: number } | Order[] | undefined;
  const salesList: Order[] = Array.isArray(salesData) ? salesData : (salesData?.data ?? salesData?.orders ?? []);
  const salesTotal: number = Array.isArray(salesData) ? salesData.length : (salesData?.total ?? 0);
  const totalOrders = (revenue?.orderCountEcommerce ?? 0) + (revenue?.orderCountInStore ?? 0);
  const averageTicket = totalOrders > 0 ? (revenue?.totalGeneral ?? 0) / totalOrders : 0;

  return (
    <div className="admin-revenue">
      <div className="admin-revenue__header">
        <h1 className="admin-revenue__title">Reporte de Ganancias</h1>
        <button onClick={handleExportCSV} className="admin-revenue__export-btn">
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      <div className="admin-revenue__period">
        <div className="admin-revenue__period-row">
          {([{ key: 'today', label: 'Hoy' }, { key: 'week', label: 'Esta semana' }, { key: 'month', label: 'Este mes' }, { key: 'custom', label: 'Personalizado' }] as const).map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={clsx('admin-revenue__period-btn', period === p.key && 'admin-revenue__period-btn--active')}>{p.label}</button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="admin-revenue__period-dates">
            <Calendar size={14} style={{ color: '#94a3b8' }} />
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="admin-revenue__period-date" />
            <span className="admin-revenue__period-sep">—</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="admin-revenue__period-date" />
          </div>
        )}
      </div>

      {loadingRevenue ? (
        <div className="admin-revenue__loading"><Loader2 className="admin-revenue__spinner" size={28} /></div>
      ) : (
        <>
          <div className="admin-revenue__metrics-grid">
            <MetricCard icon={DollarSign} label="Total General" value={formatCOP(revenue?.totalGeneral ?? 0)} color="green" />
            <MetricCard icon={ShoppingCart} label="E-commerce" value={formatCOP(revenue?.totalEcommerce ?? 0)} color="blue" />
            <MetricCard icon={Store} label="Punto de Venta" value={formatCOP(revenue?.totalInStore ?? 0)} color="pink" />
            <MetricCard icon={TrendingUp} label="Promedio / venta" value={formatCOP(averageTicket)} color="amber" />
          </div>

          <div className="admin-revenue__chart-card">
            <h3 className="admin-revenue__chart-title">Ingresos por canal</h3>
            <div className="admin-revenue__chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} tickFormatter={v => formatCOP(Number(v))} /><Tooltip formatter={v => formatCOP(Number(v))} /><Legend /><Bar dataKey="ecommerce" name="E-commerce" fill="#3b82f6" radius={[4, 4, 0, 0]} /><Bar dataKey="pos" name="Punto de Venta" fill="#D81B60" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="admin-revenue__top-grid">
            <TopProductsTable title="Top E-commerce" products={revenue?.topProductsEcommerce ?? []} />
            <TopProductsTable title="Top Punto de Venta" products={revenue?.topProductsInStore ?? []} />
          </div>
        </>
      )}

      <div className="admin-revenue__sales-card">
        <div className="admin-revenue__sales-header">
          <h3 className="admin-revenue__sales-title">Historial de ventas</h3>
          <span className="admin-revenue__sales-count">{salesTotal} registros</span>
        </div>

        {loadingSales ? (
          <div className="admin-revenue__loading"><Loader2 className="admin-revenue__spinner" size={22} /></div>
        ) : salesList.length === 0 ? (
          <p className="admin-revenue__empty">Sin ventas en este período</p>
        ) : (
          <>
            <div className="admin-revenue__sales-scroll">
              <table className="admin-revenue__sales-table">
                <thead><tr>
                  <th className="admin-revenue__sales-th">Fecha/Hora</th><th className="admin-revenue__sales-th"># Factura</th>
                  <th className="admin-revenue__sales-th">Canal</th><th className="admin-revenue__sales-th">Productos</th>
                  <th className="admin-revenue__sales-th" style={{ textAlign: 'right' }}>Total</th><th className="admin-revenue__sales-th" style={{ textAlign: 'center' }}>Estado</th>
                </tr></thead>
                <tbody>
                  {salesList.map(order => {
                    const isInStore = (order as Order & { saleChannel?: string }).saleChannel === 'IN_STORE';
                    return (
                      <tr key={order.id} className="admin-revenue__sales-tr">
                        <td className="admin-revenue__sales-td"><span className="admin-revenue__sales-td-date">{new Date(order.createdAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></td>
                        <td className="admin-revenue__sales-td"><span className="admin-revenue__sales-td-order">{order.orderNumber}</span></td>
                        <td className="admin-revenue__sales-td">
                          <span className={clsx('admin-revenue__channel-badge', isInStore ? 'admin-revenue__channel-badge--local' : 'admin-revenue__channel-badge--online')}>{isInStore ? 'LOCAL' : 'ONLINE'}</span>
                        </td>
                        <td className="admin-revenue__sales-td"><span className="admin-revenue__sales-td-products">{order.items?.map(i => i.product?.name).filter(Boolean).join(', ') || `${order.items?.length ?? 0} productos`}</span></td>
                        <td className="admin-revenue__sales-td" style={{ textAlign: 'right' }}><span className="admin-revenue__sales-td-total">{formatCOP(order.total)}</span></td>
                        <td className="admin-revenue__sales-td" style={{ textAlign: 'center' }}>
                          <span className={clsx('admin-revenue__status', `admin-revenue__status--${(STATUS_LABELS[order.status] || order.status).toLowerCase()}`)}>{STATUS_LABELS[order.status] ?? order.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {salesTotal > 20 && (
              <div className="admin-revenue__pagination">
                <button disabled={salesPage <= 1} onClick={() => setSalesPage(p => Math.max(1, p - 1))} className="admin-revenue__page-btn"><ChevronLeft size={14} /></button>
                <span className="admin-revenue__page-info">Página {salesPage} de {Math.ceil(salesTotal / 20)}</span>
                <button disabled={salesPage >= Math.ceil(salesTotal / 20)} onClick={() => setSalesPage(p => p + 1)} className="admin-revenue__page-btn"><ChevronRight size={14} /></button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
