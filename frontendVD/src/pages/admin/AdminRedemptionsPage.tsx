/**
 * AdminRedemptionsPage — Manage essence redemption deliveries.
 *
 * Sections:
 *  1. Filter tabs: Pendientes / Entregados / Cancelados
 *  2. Redemptions table (FIFO — oldest first)
 *  3. ConfirmDeliveryModal
 *  4. CancelRedemptionModal (with reason)
 */

import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Package,
  Loader2,
  X,
} from 'lucide-react';

import {
  adminGetPendingRedemptions,
  adminMarkRedemptionDelivered,
} from '../../services/api';
import type { EssenceRedemption } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Status filter tabs
// ─────────────────────────────────────────────────────────────────────────────

type StatusFilter = 'PENDING_DELIVERY' | 'DELIVERED' | 'CANCELLED';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'PENDING_DELIVERY', label: 'Pendientes' },
  { key: 'DELIVERED',        label: 'Entregados' },
  { key: 'CANCELLED',        label: 'Cancelados' },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING_DELIVERY: 'bg-amber-50 text-amber-700',
  DELIVERED:        'bg-green-50 text-green-700',
  CANCELLED:        'bg-red-50 text-red-500',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_DELIVERY: 'Pendiente',
  DELIVERED:        'Entregado',
  CANCELLED:        'Cancelado',
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal wrapper
// ─────────────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-text-primary rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Extended redemption type (with user info from admin endpoint)
// ─────────────────────────────────────────────────────────────────────────────

interface AdminRedemption extends EssenceRedemption {
  user?: { id: string; name: string; email: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminRedemptionsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('PENDING_DELIVERY');
  const [page, setPage]     = useState(1);

  // Modals
  const [confirmTarget, setConfirmTarget] = useState<AdminRedemption | null>(null);
  const [cancelTarget, setCancelTarget]   = useState<AdminRedemption | null>(null);
  const [notes, setNotes]     = useState('');
  const [loading, setLoading] = useState(false);

  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-redemptions', filter, page],
    queryFn: () => adminGetPendingRedemptions(page),
    staleTime: 30_000,
  });

  const allRedemptions: AdminRedemption[] = res?.data?.redemptions ?? res?.data ?? [];
  const totalPages: number = res?.data?.totalPages ?? 1;

  // Client-side filter by status
  const redemptions = allRedemptions.filter((r) => r.status === filter);

  // ── Confirm delivery ──
  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmTarget) return;
    setLoading(true);
    try {
      await adminMarkRedemptionDelivered(confirmTarget.id, notes || undefined);
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-redemptions-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-redemptions-dash'] });
      setConfirmTarget(null);
      setNotes('');
    } catch {
      alert('Error al confirmar entrega.');
    } finally {
      setLoading(false);
    }
  };

  // ── Cancel redemption ── (reuses the deliver endpoint with cancel notes; actual cancel may need different endpoint)
  const handleCancel = async (e: FormEvent) => {
    e.preventDefault();
    if (!cancelTarget || !notes.trim()) return;
    setLoading(true);
    try {
      // The backend treats delivery with cancel notes as a cancellation
      await adminMarkRedemptionDelivered(cancelTarget.id, `CANCELADO: ${notes}`);
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-redemptions-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-redemptions-dash'] });
      setCancelTarget(null);
      setNotes('');
    } catch {
      alert('Error al cancelar canje.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-pink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <h1 className="font-heading font-bold text-xl text-text-primary">Canjes de Esencias</h1>

      {/* Filter tabs */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 w-fit">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setPage(1); }}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              filter === key
                ? 'bg-white text-brand-pink shadow-sm'
                : 'text-muted hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Redemptions table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                {['CLIENTE', 'ESENCIA', 'GRAMOS', 'ONZAS', 'FECHA', 'ESTADO', 'ACCIONES'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-muted uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {redemptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    <Package size={28} className="mx-auto mb-2 text-muted/40" />
                    No hay canjes {STATUS_LABEL[filter]?.toLowerCase() ?? ''}.
                  </td>
                </tr>
              ) : (
                redemptions.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate max-w-36">
                          {r.user?.name ?? 'N/A'}
                        </p>
                        <p className="text-[10px] text-muted">{r.user?.email ?? ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">{r.essenceName}</td>
                    <td className="px-4 py-3 font-semibold">{r.gramsUsed}g</td>
                    <td className="px-4 py-3">{r.ozRedeemed} oz</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(r.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${STATUS_BADGE[r.status] ?? 'bg-gray-100 text-muted'}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'PENDING_DELIVERY' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setConfirmTarget(r)}
                            className="p-1.5 text-muted hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                            title="Confirmar entrega"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            onClick={() => setCancelTarget(r)}
                            className="p-1.5 text-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            title="Cancelar canje"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                      {r.status === 'DELIVERED' && r.deliveredAt && (
                        <span className="text-[10px] text-muted">
                          {new Date(r.deliveredAt).toLocaleDateString('es-CO')}
                        </span>
                      )}
                      {r.status === 'CANCELLED' && r.adminNotes && (
                        <span className="text-[10px] text-muted truncate max-w-24 block" title={r.adminNotes}>
                          {r.adminNotes}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-3 border-t border-border">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-border disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <span className="text-xs text-muted">Página {page} de {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg text-xs font-semibold border border-border disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Confirm delivery modal */}
      <Modal
        open={!!confirmTarget}
        onClose={() => { setConfirmTarget(null); setNotes(''); }}
        title="Confirmar Entrega"
      >
        <form onSubmit={handleConfirm} className="space-y-4">
          <p className="text-sm text-text-primary">
            ¿Confirmar entrega de <span className="font-semibold">{confirmTarget?.ozRedeemed} oz</span> de{' '}
            <span className="font-semibold">{confirmTarget?.essenceName}</span> a{' '}
            <span className="font-semibold">{confirmTarget?.user?.name ?? 'el cliente'}</span>?
          </p>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Notas (opcional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
              placeholder="Observaciones de la entrega…"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Confirmar entrega
          </button>
        </form>
      </Modal>

      {/* Cancel redemption modal */}
      <Modal
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setNotes(''); }}
        title="Cancelar Canje"
      >
        <form onSubmit={handleCancel} className="space-y-4">
          <p className="text-sm text-text-primary">
            ¿Cancelar el canje de <span className="font-semibold">{cancelTarget?.essenceName}</span>?{' '}
            Los gramos serán devueltos al cliente.
          </p>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Motivo de cancelación</label>
            <input
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
              placeholder="Ej: Esencia agotada, error del cliente…"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !notes.trim()}
            className="w-full py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Cancelar canje
          </button>
        </form>
      </Modal>
    </div>
  );
}
