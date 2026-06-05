/**
 * AdminRedemptionsPage — Manage essence redemption deliveries.
 *
 * Sections:
 *  1. Filter tabs: Pendientes / Entregados / Cancelados
 *  2. Redemptions table with status badges
 *  3. Confirm Delivery modal
 *  4. Cancel Redemption modal
 */

import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, CheckCircle, XCircle, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { AdminQueryError } from '../../components/admin/AdminQueryError';
import { useToastStore } from '../../stores/toastStore';
import { adminGetPendingRedemptions, adminMarkRedemptionDelivered } from '../../services/api';
import type { EssenceRedemption, User } from '../../types';
import '../../css/AdminRedemptionsPage.css';

const STATUS_FILTER: { label: string; value: string }[] = [
  { label: 'Pendientes', value: 'PENDING_DELIVERY' },
  { label: 'Entregados', value: 'DELIVERED' },
  { label: 'Cancelados', value: 'CANCELLED' },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING_DELIVERY: 'admin-redemptions__status--pending',
  DELIVERED: 'admin-redemptions__status--delivered',
  CANCELLED: 'admin-redemptions__status--cancelled',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING_DELIVERY: 'Pendiente', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
};

// ─── Modal generic ───────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="admin-redemptions__modal-overlay">
      <div className="admin-redemptions__modal-backdrop" onClick={onClose} />
      <div className="admin-redemptions__modal-body">
        <div className="admin-redemptions__modal-header">
          <h2 className="admin-redemptions__modal-title">{title}</h2>
          <button onClick={onClose} className="admin-redemptions__modal-close"><X size={18} /></button>
        </div>
        <div className="admin-redemptions__modal-content">{children}</div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AdminRedemptionsPage() {
  const queryClient = useQueryClient();
  const addToast = useToastStore(s => s.addToast);
  const [filter, setFilter] = useState('PENDING_DELIVERY');
  const [page, setPage] = useState(1);

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['admin-redemptions', filter, page],
    queryFn: () => adminGetPendingRedemptions(page, filter),
    staleTime: 30_000,
  });

  const [confirmTarget, setConfirmTarget] = useState<EssenceRedemption | null>(null);
  const [cancelTarget, setCancelTarget] = useState<EssenceRedemption | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (isError) return <AdminQueryError />;

  const redemptionsRaw = res?.data?.redemptions ?? res?.data;
  const redemptions: EssenceRedemption[] = Array.isArray(redemptionsRaw) ? redemptionsRaw : [];
  const totalPages: number = res?.data?.totalPages ?? 1;

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault(); if (!confirmTarget) return;
    setLoading(true);
    try {
      await adminMarkRedemptionDelivered(confirmTarget.id, notes || undefined);
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-redemptions-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-redemptions-dash'] });
      setConfirmTarget(null); setNotes('');
    } catch { addToast('Error al confirmar entrega.', 'error'); }
    finally { setLoading(false); }
  };

  const handleCancel = async (e: FormEvent) => {
    e.preventDefault(); if (!cancelTarget || !notes.trim()) return;
    setLoading(true);
    try {
      await adminMarkRedemptionDelivered(cancelTarget.id, `CANCELADO: ${notes}`);
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-redemptions-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-redemptions-dash'] });
      setCancelTarget(null); setNotes('');
    } catch { addToast('Error al cancelar canje.', 'error'); }
    finally { setLoading(false); }
  };

  if (isLoading) {
    return <div className="admin-redemptions__loading"><div className="admin-redemptions__spinner" /></div>;
  }

  return (
    <div className="admin-redemptions">
      <div className="admin-redemptions__header">
        <h1 className="admin-redemptions__title">Canjes de Esencias</h1>
      </div>

      <div className="admin-redemptions__tabs">
        {STATUS_FILTER.map(f => (
          <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }}
            className={clsx('admin-redemptions__tab', filter === f.value && 'admin-redemptions__tab--active')}>{f.label}</button>
        ))}
      </div>

      <div className="admin-redemptions__table-card">
        <div className="admin-redemptions__table-scroll">
          <table className="admin-redemptions__table">
            <thead><tr>{['CLIENTE','ESENCIA','GRAMOS','ONZAS','FECHA','ESTADO','ACCIONES'].map(h => <th key={h} className="admin-redemptions__th">{h}</th>)}</tr></thead>
            <tbody className="admin-redemptions__tbody">
              {redemptions.length === 0 ? (
                <tr><td colSpan={7} className="admin-redemptions__empty">
                  <Package size={28} className="admin-redemptions__empty-icon" />
                  No hay canjes {STATUS_LABEL[filter]?.toLowerCase() ?? ''}.
                </td></tr>
              ) : redemptions.map(r => {
                const user = (r as EssenceRedemption & { user?: User }).user;
                const userName = user?.name ?? '—';
                const userEmail = user?.email ?? '';
                const date = new Date(r.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
                const deliveredDate = r.deliveredAt ? new Date(r.deliveredAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                return (
                  <tr key={r.id}>
                    <td className="admin-redemptions__td">
                      <span className="admin-redemptions__td-name">{userName}</span>
                      {userEmail && <span className="admin-redemptions__td-email">{userEmail}</span>}
                    </td>
                    <td className="admin-redemptions__td"><span className="admin-redemptions__td-name" style={{ maxWidth: '8rem' }}>{r.essenceName}</span></td>
                    <td className="admin-redemptions__td" style={{ fontWeight: 600, color: '#1e293b' }}>{r.gramsUsed}g</td>
                    <td className="admin-redemptions__td" style={{ fontWeight: 600, color: '#1e293b' }}>{r.ozRedeemed}</td>
                    <td className="admin-redemptions__td">
                      <span className="admin-redemptions__td-date">{date}</span>
                      {r.status === 'DELIVERED' && deliveredDate && <span className="admin-redemptions__td-date admin-redemptions__td-date--sm">{deliveredDate}</span>}
                      {r.status === 'CANCELLED' && r.adminNotes && <span className="admin-redemptions__td-date admin-redemptions__td-date--sm">{r.adminNotes.replace('CANCELADO: ', '')}</span>}
                    </td>
                    <td className="admin-redemptions__td">
                      <span className={clsx('admin-redemptions__status', STATUS_BADGE[r.status] ?? 'admin-redemptions__status--pending')}>{STATUS_LABEL[r.status] ?? r.status}</span>
                    </td>
                    <td className="admin-redemptions__td">
                      <div className="admin-redemptions__td-actions">
                        {r.status === 'PENDING_DELIVERY' && (
                          <>
                            <button onClick={() => setConfirmTarget(r)} className="admin-redemptions__action-btn admin-redemptions__action-btn--confirm" aria-label="Confirmar entrega"><CheckCircle size={13} /></button>
                            <button onClick={() => setCancelTarget(r)} className="admin-redemptions__action-btn admin-redemptions__action-btn--cancel" aria-label="Cancelar canje"><XCircle size={13} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="admin-redemptions__pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="admin-redemptions__page-btn"><ChevronLeft size={14} /> Anterior</button>
            <span className="admin-redemptions__page-info">Página {page} de {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="admin-redemptions__page-btn">Siguiente <ChevronRight size={14} /></button>
          </div>
        )}
      </div>

      <Modal open={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="Confirmar Entrega">
        {confirmTarget && (
          <form onSubmit={handleConfirm} className="admin-redemptions__modal-form">
            <p className="admin-redemptions__modal-text">¿Confirmas la entrega de <strong>{confirmTarget.ozRedeemed} oz</strong> de <strong>{confirmTarget.essenceName}</strong> a <strong>{(confirmTarget as EssenceRedemption & { user?: User }).user?.name ?? 'N/A'}</strong>?</p>
            <div className="admin-redemptions__modal-field">
              <label className="admin-redemptions__modal-label">Notas (opcional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className="admin-redemptions__modal-input" placeholder="Observaciones de la entrega…" />
            </div>
            <button type="submit" disabled={loading} className="admin-redemptions__modal-submit admin-redemptions__modal-submit--confirm">
              {loading && <Loader2 size={14} className="admin-gamification__adjust-spinner" style={{ animation: 'rd-spin 0.6s linear infinite', width: '1rem', height: '1rem', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />}
              Confirmar entrega
            </button>
          </form>
        )}
      </Modal>

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancelar Canje">
        {cancelTarget && (
          <form onSubmit={handleCancel} className="admin-redemptions__modal-form">
            <p className="admin-redemptions__modal-text">¿Cancelar el canje de <strong>{cancelTarget.ozRedeemed} oz</strong> de <strong>{cancelTarget.essenceName}</strong>? Los gramos serán devueltos al cliente.</p>
            <div className="admin-redemptions__modal-field">
              <label className="admin-redemptions__modal-label">Motivo de cancelación *</label>
              <input required value={notes} onChange={e => setNotes(e.target.value)} className="admin-redemptions__modal-input" placeholder="Explica el motivo…" />
            </div>
            <button type="submit" disabled={loading || !notes.trim()} className="admin-redemptions__modal-submit admin-redemptions__modal-submit--cancel">
              {loading && <Loader2 size={14} className="admin-gamification__adjust-spinner" style={{ animation: 'rd-spin 0.6s linear infinite', width: '1rem', height: '1rem', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />}
              Cancelar canje
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}
