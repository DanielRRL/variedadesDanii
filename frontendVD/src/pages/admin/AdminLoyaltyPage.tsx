/**
 * AdminLoyaltyPage.tsx — Gram account management for admins.
 *
 * Features:
 *  - Stats cards (total grams earned, redeemed, tokens issued, active accounts)
 *  - Manual gram adjustment form: search user, enter grams (+/-), reason
 *  - Submits to POST /api/admin/grams/adjust
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Scale, CheckCircle2, Gamepad2, Gift, TrendingUp } from 'lucide-react';
import { searchUsers, adminAdjustGrams, getGamificationStats } from '../../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const REASONS = [
  'Compensación por demora',
  'Bono de bienvenida',
  'Ajuste manual de gramos',
  'Corrección de error',
  'Premio de campaña',
  'Deducción por devolución',
  'Otro',
];

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

interface UserHit {
  id: string;
  name: string;
  email: string;
  gramAccount?: { currentGrams: number; totalEarned: number; totalRedeemed: number };
}

export default function AdminLoyaltyPage() {
  // ── Gamification stats ──────────────────────────────────────────────────────
  const { data: statsRes } = useQuery({
    queryKey: ['admin-gamification-stats'],
    queryFn: getGamificationStats,
    staleTime: 60_000,
  });

  const stats = statsRes?.data ?? {};

  // ── User search + selection ─────────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserHit | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: usersRes } = useQuery({
    queryKey: ['admin-users-search', userSearch],
    queryFn: () => searchUsers({ search: userSearch }),
    enabled: userSearch.length >= 2,
    staleTime: 30_000,
  });

  const userHits: UserHit[] = usersRes?.data?.users ?? usersRes?.data ?? [];

  // ── Adjustment form ──────────────────────────────────────────────────────────
  const [grams, setGrams]     = useState('');
  const [reason, setReason]   = useState(REASONS[0]);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) { setError('Selecciona un usuario.'); return; }
    const delta = parseInt(grams, 10);
    if (isNaN(delta) || delta === 0) { setError('Ingresa una cantidad de gramos válida (puede ser negativa).'); return; }
    setError('');
    setBusy(true);
    try {
      await adminAdjustGrams({ userId: selectedUser.id, delta, reason });
      setSuccess(`✓ ${delta > 0 ? '+' : ''}${delta}g aplicados a ${selectedUser.name}.`);
      setGrams('');
      setSelectedUser(null);
      setUserSearch('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al ajustar los gramos.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary">Fidelización</h1>
        <p className="text-xs text-muted mt-0.5">Gestiona gramos y programa de gamificación</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Gramos emitidos',  value: stats.totalGramsEarned  ?? '—', Icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Gramos canjeados', value: stats.totalGramsRedeemed ?? '—', Icon: Gift,       color: 'text-brand-gold',  bg: 'bg-yellow-50  border-yellow-200' },
          { label: 'Fichas emitidas',  value: stats.totalTokensIssued ?? '—', Icon: Gamepad2,   color: 'text-brand-pink',  bg: 'bg-pink-50    border-pink-200'   },
          { label: 'Cuentas activas',  value: stats.activeAccounts    ?? '—', Icon: Scale,      color: 'text-blue-600',    bg: 'bg-blue-50    border-blue-200'   },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className={`border rounded-xl p-4 flex flex-col gap-2 ${bg}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">{label}</span>
              <Icon size={15} className={color} />
            </div>
            <p className="font-heading font-bold text-2xl text-text-primary leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* Gram adjustment form */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-text-primary">Ajuste Manual de Gramos</h2>
          <p className="text-xs text-muted mt-0.5">
            Ingresa un valor positivo para sumar gramos o negativo para deducir.
          </p>
        </div>

        <form onSubmit={handleAdjust} className="p-5 space-y-5">

          {/* User search */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1.5">
              Usuario
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Nombre o correo del cliente…"
                value={selectedUser ? `${selectedUser.name} (${selectedUser.email})` : userSearch}
                onChange={(e) => {
                  setSelectedUser(null);
                  setUserSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50"
              />

              {/* Results dropdown */}
              {showDropdown && userHits.length > 0 && !selectedUser && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                    {userHits.slice(0, 8).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setSelectedUser(u); setShowDropdown(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-brand-pink/20 flex items-center justify-center shrink-0">
                          <span className="text-brand-pink font-bold text-[10px]">
                            {u.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-text-primary">{u.name}</p>
                          <p className="text-[10px] text-muted">{u.email}</p>
                        </div>
                        {u.gramAccount && (
                          <span className="ml-auto text-[10px] font-semibold text-brand-gold">
                            {u.gramAccount.currentGrams}g
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {selectedUser?.gramAccount && (
              <p className="text-[11px] text-muted mt-1">
                Gramos actuales:{' '}
                <span className="font-semibold text-brand-gold">{selectedUser.gramAccount.currentGrams}g</span>
                {' · Ganados: '}
                <span className="font-semibold">{selectedUser.gramAccount.totalEarned}g</span>
                {' · Canjeados: '}
                <span className="font-semibold">{selectedUser.gramAccount.totalRedeemed}g</span>
              </p>
            )}
          </div>

          {/* Grams amount */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1.5" htmlFor="adj-grams">
              Cantidad de gramos
            </label>
            <input
              id="adj-grams"
              type="number"
              step="1"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              placeholder="Ej: 5 para sumar, -3 para deducir"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50"
            />
            {grams && !isNaN(parseInt(grams)) && (
              <p className={`text-[11px] mt-1 font-semibold ${parseInt(grams) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {parseInt(grams) >= 0 ? `+${grams}g (suma)` : `${grams}g (deducción)`}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1.5" htmlFor="adj-reason">
              Motivo
            </label>
            <select
              id="adj-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50"
            >
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>

          {/* Feedback */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 flex items-center gap-2">
              <CheckCircle2 size={14} />
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !selectedUser}
            className="px-6 py-2.5 bg-brand-pink text-white font-semibold text-sm rounded-xl hover:bg-brand-pink/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {busy && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Aplicar Ajuste
          </button>
        </form>
      </div>
    </div>
  );
}
