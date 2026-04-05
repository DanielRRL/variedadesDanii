/**
 * AdminClientsPage — Client management with search and history modal.
 *
 * Sections:
 *  1. Search bar
 *  2. Clients data table
 *  3. ClientHistoryModal (3 inner tabs: Pedidos, Gramos, Canjes)
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Eye,
  X,
  ShoppingBag,
  Gem,
  Gift,
  Users,
  ShieldCheck,
} from 'lucide-react';

import { searchUsers, getClientHistory, adminVerifyUser } from '../../services/api';
import { formatCOP } from '../../utils/format';
import type { User, Order, GramTransaction, EssenceRedemption } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Client History Modal
// ─────────────────────────────────────────────────────────────────────────────

type HistoryTab = 'orders' | 'grams' | 'redemptions';

const HISTORY_TABS: { key: HistoryTab; label: string; Icon: typeof ShoppingBag }[] = [
  { key: 'orders',      label: 'Pedidos', Icon: ShoppingBag },
  { key: 'grams',       label: 'Gramos',  Icon: Gem },
  { key: 'redemptions', label: 'Canjes',  Icon: Gift },
];

function ClientHistoryModal({
  userId,
  userName,
  open,
  onClose,
}: {
  userId: string;
  userName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<HistoryTab>('orders');

  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-client-history', userId],
    queryFn: () => getClientHistory(userId),
    enabled: open,
    staleTime: 30_000,
  });

  const history = res?.data ?? {};
  const orders: Order[]                = history.orders ?? [];
  const gramTxns: GramTransaction[]    = history.gramTransactions ?? [];
  const redemptions: EssenceRedemption[] = history.redemptions ?? [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-heading font-semibold text-text-primary">
            Historial — {userName}
          </h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-text-primary rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Inner tabs */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 w-fit">
            {HISTORY_TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  tab === key
                    ? 'bg-white text-brand-pink shadow-sm'
                    : 'text-muted hover:text-text-primary'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-3 border-brand-pink border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Orders tab */}
              {tab === 'orders' && (
                orders.length === 0 ? (
                  <p className="text-muted text-sm text-center py-6">Sin pedidos registrados.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-gray-50">
                        {['PEDIDO', 'FECHA', 'TOTAL', 'ESTADO'].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-muted uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {orders.map((o) => (
                        <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2 font-mono font-semibold text-brand-blue">{o.orderNumber}</td>
                          <td className="px-3 py-2 text-muted">{new Date(o.createdAt).toLocaleDateString('es-CO')}</td>
                          <td className="px-3 py-2 font-semibold">{formatCOP(o.total)}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-text-primary font-semibold text-[10px]">
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* Grams tab */}
              {tab === 'grams' && (
                gramTxns.length === 0 ? (
                  <p className="text-muted text-sm text-center py-6">Sin transacciones de gramos.</p>
                ) : (
                  <div className="space-y-2">
                    {gramTxns.map((t) => (
                      <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-text-primary">{t.description}</p>
                          <p className="text-[10px] text-muted">{new Date(t.createdAt).toLocaleDateString('es-CO')}</p>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${
                          t.gramsDelta > 0 ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {t.gramsDelta > 0 ? '+' : ''}{t.gramsDelta}g
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Redemptions tab */}
              {tab === 'redemptions' && (
                redemptions.length === 0 ? (
                  <p className="text-muted text-sm text-center py-6">Sin canjes registrados.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-gray-50">
                        {['ESENCIA', 'GRAMOS', 'FECHA', 'ESTADO'].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-muted uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {redemptions.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2 font-medium text-text-primary">{r.essenceName}</td>
                          <td className="px-3 py-2 font-semibold">{r.gramsUsed}g</td>
                          <td className="px-3 py-2 text-muted">{new Date(r.createdAt).toLocaleDateString('es-CO')}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                              r.status === 'DELIVERED'
                                ? 'bg-green-50 text-green-700'
                                : r.status === 'CANCELLED'
                                  ? 'bg-red-50 text-red-500'
                                  : 'bg-amber-50 text-amber-700'
                            }`}>
                              {r.status === 'DELIVERED' ? 'Entregado' : r.status === 'CANCELLED' ? 'Cancelado' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [historyUser, setHistoryUser] = useState<{ id: string; name: string } | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-clients', search, page],
    queryFn: () => searchUsers({ search: search || undefined, page }),
    staleTime: 30_000,
  });

  const users: User[] = res?.data?.users ?? [];
  const totalPages: number = res?.data?.totalPages ?? 1;

  const handleVerify = async (userId: string) => {
    setVerifyingId(userId);
    try {
      await adminVerifyUser(userId);
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
    } catch {
      alert('Error al verificar el usuario.');
    } finally {
      setVerifyingId(null);
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
      <h1 className="font-heading font-bold text-xl text-text-primary">Clientes</h1>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre, email o teléfono…"
          className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
        />
      </div>

      {/* Clients table */}
      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                {['CLIENTE', 'EMAIL', 'TELÉFONO', 'ROL', 'FIDELIZACIÓN', 'ACCIONES'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-muted uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    <Users size={28} className="mx-auto mb-2 text-muted/40" />
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const initials = u.name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-pink/20 flex items-center justify-center shrink-0">
                            <span className="text-brand-pink font-bold text-[10px]">{initials}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-text-primary truncate max-w-36">{u.name}</p>
                            <p className="text-[10px] text-muted">
                              {u.emailVerified ? '✓ Verificado' : 'Sin verificar'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{u.email}</td>
                      <td className="px-4 py-3 text-muted">{u.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700'
                            : u.role === 'SELLER'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-text-primary'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.loyaltyAccount ? (
                          <div className="text-[10px]">
                            <span className="font-semibold text-brand-pink">{u.loyaltyAccount.points} pts</span>
                            <span className="mx-1 text-muted">·</span>
                            <span className={`font-semibold ${
                              u.loyaltyAccount.level === 'VIP'
                                ? 'text-brand-gold'
                                : u.loyaltyAccount.level === 'PREFERRED'
                                  ? 'text-brand-pink'
                                  : 'text-muted'
                            }`}>
                              {u.loyaltyAccount.level}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {!u.emailVerified && u.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleVerify(u.id)}
                              disabled={verifyingId === u.id}
                              className="p-1.5 text-muted hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                              title="Verificar cuenta"
                            >
                              {verifyingId === u.id ? (
                                <span className="block w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <ShieldCheck size={14} />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => setHistoryUser({ id: u.id, name: u.name })}
                            className="p-1.5 text-muted hover:text-brand-blue rounded-lg hover:bg-blue-50 transition-colors"
                            title="Ver historial"
                          >
                            <Eye size={14} />
                          </button>
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

      {/* Client history modal */}
      <ClientHistoryModal
        userId={historyUser?.id ?? ''}
        userName={historyUser?.name ?? ''}
        open={!!historyUser}
        onClose={() => setHistoryUser(null)}
      />
    </div>
  );
}
