/**
 * AdminInvoicesPage.tsx — DIAN electronic invoice management.
 *
 * Features:
 *  - Filter tabs: TODOS | DRAFT | SENT | ACCEPTED | REJECTED
 *  - Table: Invoice#, Order#, Client, Monto, Estado, CUFE, Acciones
 *  - DRAFT → Reintentar button (POST /api/admin/invoices/:orderId/retry)
 *  - ACCEPTED/SENT → Copy CUFE button
 *  - Pagination
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, RefreshCw, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { getAdminInvoices, retryInvoice } from '../../services/api';
import { formatCOP } from '../../utils/format';
import type { AdminInvoice } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { key: '',         label: 'Todos'    },
  { key: 'DRAFT',    label: 'Borrador' },
  { key: 'SENT',     label: 'Enviada'  },
  { key: 'ACCEPTED', label: 'Aceptada' },
  { key: 'REJECTED', label: 'Rechazada'},
] as const;

const STATUS_COLORS: Record<string, string> = {
  DRAFT:    'bg-gray-100 text-gray-600',
  SENT:     'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT:    'Borrador',
  SENT:     'Enviada',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
};

// ─────────────────────────────────────────────────────────────────────────────
// Copy CUFE button
// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('No se pudo copiar el CUFE.');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium border border-border rounded-lg hover:bg-gray-50 transition-colors"
      title={text}
    >
      {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
      {copied ? 'Copiado' : 'CUFE'}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Retry button
// ─────────────────────────────────────────────────────────────────────────────

function RetryButton({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const [busy, setBusy]   = useState(false);
  const [done, setDone]   = useState(false);

  const handleRetry = async () => {
    if (!window.confirm('¿Reenviar esta factura a la DIAN?')) return;
    setBusy(true);
    try {
      await retryInvoice(orderId);
      setDone(true);
      onDone();
    } catch {
      alert('Error al reintentar la factura.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      disabled={busy || done}
      onClick={handleRetry}
      className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold border border-brand-pink text-brand-pink rounded-lg hover:bg-brand-pink/5 transition-colors disabled:opacity-50"
    >
      {busy
        ? <span className="w-3 h-3 border border-t-transparent border-brand-pink rounded-full animate-spin" />
        : <RefreshCw size={11} />}
      {done ? 'Reenviado' : 'Reintentar'}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminInvoicesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('');
  const [page, setPage]           = useState(1);
  const limit                     = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-invoices', activeTab, page],
    queryFn: () => getAdminInvoices({ status: activeTab || undefined, page }),
    staleTime: 60_000,
  });

  const invoices: AdminInvoice[] = data?.data?.invoices ?? data?.data ?? [];
  const total: number            = data?.data?.total    ?? invoices.length;
  const totalPages               = Math.max(1, Math.ceil(total / limit));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary">Facturas Electrónicas</h1>
        <p className="text-xs text-muted mt-0.5">Gestión de facturas DIAN emitidas por cada pedido pagado</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-brand-pink shadow-sm'
                : 'text-muted hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                {['FACTURA #', 'PEDIDO #', 'CLIENTE', 'MONTO', 'ESTADO', 'CUFE', 'FECHA', 'ACCIONES'].map((h) => (
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
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted">
                    No se encontraron facturas.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const date = new Date(inv.createdAt).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  });

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-text-primary">
                          {inv.invoiceNumber ?? `#${inv.id.slice(-6)}`}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-mono text-brand-blue font-semibold">
                          {inv.orderNumber ?? inv.orderId.slice(-8)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-medium text-text-primary truncate max-w-35 block">
                          {inv.clientName ?? '—'}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-semibold text-text-primary whitespace-nowrap">
                        {formatCOP(inv.amount)}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {inv.cufe ? (
                          <span className="font-mono text-[10px] text-muted" title={inv.cufe}>
                            {inv.cufe.slice(0, 12)}…
                          </span>
                        ) : (
                          <span className="text-muted italic">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-muted whitespace-nowrap">{date}</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {inv.status === 'DRAFT' && (
                            <RetryButton orderId={inv.orderId} onDone={invalidate} />
                          )}
                          {inv.cufe && ['SENT', 'ACCEPTED'].includes(inv.status) && (
                            <CopyButton text={inv.cufe} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && invoices.length > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted">
              Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total} facturas
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
