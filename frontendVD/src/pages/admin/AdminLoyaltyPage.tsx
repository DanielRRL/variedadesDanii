/**
 * AdminLoyaltyPage.tsx — Loyalty account management for admins.
 *
 * Features:
 *  - Stats cards (total users per tier, total points outstanding)
 *  - Manual points adjustment form: search user, enter points (+/-), reason
 *  - Submits to POST /api/admin/loyalty/adjust
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Trophy, Star, Zap, Crown, CheckCircle2 } from 'lucide-react';
import { searchUsers, adminAdjustPoints } from '../../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Tier config
// ─────────────────────────────────────────────────────────────────────────────

const TIERS = [
  { key: 'BRONZE', label: 'Bronce',   Icon: Star,     color: 'text-amber-600',  bg: 'bg-amber-50  border-amber-200' },
  { key: 'SILVER', label: 'Plata',    Icon: Zap,      color: 'text-gray-500',   bg: 'bg-gray-50   border-gray-200'  },
  { key: 'GOLD',   label: 'Oro',      Icon: Trophy,   color: 'text-brand-gold', bg: 'bg-yellow-50 border-yellow-200'},
  { key: 'VIP',    label: 'VIP',      Icon: Crown,    color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200'},
] as const;

const REASONS = [
  'Compensación por demora',
  'Bono de bienvenida',
  'Ajuste manual de puntos',
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
  loyaltyAccount?: { points: number; level: string };
}

export default function AdminLoyaltyPage() {

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
  const [points, setPoints]   = useState('');
  const [reason, setReason]   = useState(REASONS[0]);
  const [busy,   setBusy]     = useState(false);
  const [error,  setError]    = useState('');
  const [success, setSuccess] = useState('');

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) { setError('Selecciona un usuario.'); return; }
    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts === 0) { setError('Ingresa una cantidad de puntos válida (puede ser negativa).'); return; }
    setError('');
    setBusy(true);
    try {
      await adminAdjustPoints({ userId: selectedUser.id, points: pts, reason });
      setSuccess(`✓ ${pts > 0 ? '+' : ''}${pts} puntos aplicados a ${selectedUser.name}.`);
      setPoints('');
      setSelectedUser(null);
      setUserSearch('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al ajustar los puntos.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary">Fidelización</h1>
        <p className="text-xs text-muted mt-0.5">Ajusta puntos y gestiona el programa de lealtad</p>
      </div>

      {/* Tier stats — decorative placeholder (real data would need a /admin/loyalty/stats endpoint) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TIERS.map(({ key, label, Icon, color, bg }) => (
          <div key={key} className={`border rounded-xl p-4 flex flex-col gap-2 ${bg}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">{label}</span>
              <Icon size={15} className={color} />
            </div>
            <p className="font-heading font-bold text-2xl text-text-primary leading-none">—</p>
            <p className="text-[10px] text-muted">usuarios activos</p>
          </div>
        ))}
      </div>

      {/* Points adjustment form */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-heading font-semibold text-text-primary">Ajuste Manual de Puntos</h2>
          <p className="text-xs text-muted mt-0.5">
            Ingresa un valor positivo para sumar puntos o negativo para deducir.
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
                        {u.loyaltyAccount && (
                          <span className="ml-auto text-[10px] font-semibold text-brand-gold">
                            {u.loyaltyAccount.points} pts
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {selectedUser?.loyaltyAccount && (
              <p className="text-[11px] text-muted mt-1">
                Puntos actuales:{' '}
                <span className="font-semibold text-brand-gold">{selectedUser.loyaltyAccount.points}</span>
                {' · Nivel: '}
                <span className="font-semibold">{selectedUser.loyaltyAccount.level}</span>
              </p>
            )}
          </div>

          {/* Points amount */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase mb-1.5" htmlFor="adj-points">
              Cantidad de puntos
            </label>
            <input
              id="adj-points"
              type="number"
              step="1"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Ej: 100 para sumar, -50 para deducir"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:border-brand-pink bg-gray-50"
            />
            {points && !isNaN(parseInt(points)) && (
              <p className={`text-[11px] mt-1 font-semibold ${parseInt(points) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {parseInt(points) >= 0 ? `+${points} puntos (suma)` : `${points} puntos (deducción)`}
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
