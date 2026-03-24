/**
 * AdminOrdersPage.tsx — Full order management list for admins.
 *
 * Features:
 *  - Search by order number or client name
 *  - Status filter
 *  - Date range filter
 *  - Pagination (pageSize selector)
 *  - In-row status transition dropdown
 *  - CSV export button
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Download, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

import { getAdminOrders, updateOrderStatus, downloadSalesCSV } from '../../services/api';
import { formatCOP } from '../../utils/format';
import { STATUS_LABELS, STATUS_COLORS, VALID_TRANSITIONS } from './adminShared';
import type { AdminOrder } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Status transition dropdown (same pattern as Dashboard)
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
  if (next.length === 0) return <span className="text-[10px] text-muted italic">—</span>;

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
        Avanzar
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-20 min-w-40 overflow-hidden">
            {next.map((s) => (
              <button
                key={s}
                onClick={() => handleSelect(s)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                  s === 'CANCELLED' ? 'text-red-500 font-medium' : 'text-text-primary'
                }`}
              >
                → {STATUS_LABELS[s] ?? s}
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

const STATUS_OPTIONS = ['', 'PENDING', 'PAID', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'];
const PAGE_SIZES     = [10, 25, 50];

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();

  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [from,   setFrom]       = useState('');
  const [to,     setTo]         = useState('');
  const [page,   setPage]       = useState(1);
  const [limit,  setLimit]      = useState(25);
  const [csvBusy, setCsvBusy]   = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', search, status, from, to, page, limit],
    queryFn: () =>
      getAdminOrders({
        search:  search   || undefined,
        status:  status   || undefined,
        page,
        limit,
      }),
    staleTime: 30_000,
  });

  const orders: AdminOrder[] = data?.data?.orders ?? data?.data ?? [];
  const total: number        = data?.data?.total  ?? orders.length;
  const totalPages           = Math.max(1, Math.ceil(total / limit));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setCsvBusy(true);
    try {
      const res  = await downloadSalesCSV({ from: from || undefined, to: to || undefined });
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `ventas_${from || 'all'}_${to || 'all'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al exportar el CSV.');
    } finally {
      setCsvBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary">Pedidos</h1>
          <p className="text-xs text-muted mt-0.5">Gestiona y actualiza el estado de los pedidos</p>
        </div>
        <button
          onClick={handleExport}
          disabled={csvBusy}
          className="flex items-center gap-2 px-4 py-2 bg-brand-pink text-white text-sm font-semibold rounded-xl hover:bg-brand-pink/90 transition-colors disabled:opacity-60"
        >
          {csvBusy
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Download size={15} />}
          Exportar CSV
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-border p-4 flex flex-wrap gap-3 items-end">

        {/* Search */}
        <div className="relative flex-1 min-w-50">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por pedido # o cliente…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50"
          />
        </div>

        {/* Status filter */}
        <div>
          <label className="block text-[10px] font-semibold text-muted uppercase mb-1">Estado</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s ? STATUS_LABELS[s] ?? s : 'Todos'}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div>
          <label className="block text-[10px] font-semibold text-muted uppercase mb-1">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-muted uppercase mb-1">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50"
          />
        </div>

        {/* Page size */}
        <div>
          <label className="block text-[10px] font-semibold text-muted uppercase mb-1">Mostrar</label>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50"
          >
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                {['#', 'FECHA', 'CLIENTE', 'ESENCIAS', 'TOTAL', 'PAGO', 'ESTADO', 'ACCIONES'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-muted uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="inline-block w-6 h-6 border-4 border-brand-pink border-t-transparent rounded-full animate-spin" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted">
                    No se encontraron pedidos.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const date = new Date(order.createdAt).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'short',
                  });
                  const essenceList =
                    order.items
                      ?.map((it) => it.product?.essence?.name ?? it.product?.name ?? '')
                      .filter(Boolean)
                      .join(', ') ?? '—';

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-brand-blue font-semibold">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">{date}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary truncate max-w-35">
                          {order.client?.name ?? 'N/A'}
                        </p>
                        <p className="text-muted truncate max-w-35">
                          {order.client?.email ?? ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 max-w-50">
                        <span className="text-muted truncate block">{essenceList}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-text-primary whitespace-nowrap">
                        {formatCOP(order.total)}
                      </td>
                      <td className="px-4 py-3 text-muted uppercase text-[10px]">
                        {order.paymentMethod ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] whitespace-nowrap ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusDropdown orderId={order.id} current={order.status} onUpdated={invalidate} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && orders.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted">
              Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total} pedidos
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-border text-muted hover:text-text-primary hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 text-xs font-medium text-text-primary">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-border text-muted hover:text-text-primary hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
