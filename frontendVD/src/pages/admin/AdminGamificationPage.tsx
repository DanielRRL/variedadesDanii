/**
 * AdminGamificationPage — 3-tab panel for gamification management.
 *
 * Tabs:
 *  1. Estadísticas — 4 stat cards + top 10 players
 *  2. Desafíos Semanales — current challenge + create new
 *  3. Ajuste de Gramos — user search + delta stepper + apply
 */

import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Trophy,
  Scale,
  Gem,
  Clock,
  Gift,
  Gamepad2,
  Plus,
  Search,
  Loader2,
  X,
  Minus,
} from 'lucide-react';

import {
  getGamificationStats,
  adminCreateChallenge,
  adminAdjustGrams,
  searchUsers,
} from '../../services/api';
import type { User, WeeklyChallenge } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Tab type
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'stats' | 'challenges' | 'adjust';

const TABS: { key: Tab; label: string; Icon: typeof BarChart3 }[] = [
  { key: 'stats',      label: 'Estadísticas',        Icon: BarChart3 },
  { key: 'challenges', label: 'Desafíos Semanales',  Icon: Trophy },
  { key: 'adjust',     label: 'Ajuste de Gramos',    Icon: Scale },
];

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub }: {
  icon: typeof Gem;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-brand-pink/10 flex items-center justify-center shrink-0">
          <Icon size={17} className="text-brand-pink" />
        </div>
        <span className="text-xs font-semibold text-muted">{label}</span>
      </div>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-[10px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Statistics tab
// ─────────────────────────────────────────────────────────────────────────────

function StatsTab({ stats }: { stats: Record<string, unknown> }) {
  const totalGrams   = Number(stats.totalGramsIssued ?? 0);
  const totalRedeemed = Number(stats.totalGramsRedeemed ?? 0);
  const activeTokens = Number(stats.activeTokens ?? 0);
  const totalGames   = Number(stats.totalGamesPlayed ?? 0);

  const topPlayers: { name: string; grams: number }[] =
    (stats.topPlayers as { name: string; grams: number }[] | undefined) ?? [];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Gem}      label="Gramos Emitidos"    value={`${totalGrams}g`} />
        <StatCard icon={Gift}     label="Gramos Canjeados"   value={`${totalRedeemed}g`} />
        <StatCard icon={Clock}    label="Fichas Activas"     value={String(activeTokens)} />
        <StatCard icon={Gamepad2} label="Juegos Realizados"  value={String(totalGames)} />
      </div>

      {/* Top 10 players */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-text-primary text-sm">Top 10 Jugadores</h3>
        </div>
        {topPlayers.length === 0 ? (
          <p className="px-5 py-6 text-muted text-sm text-center">Sin datos de jugadores aún.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-muted uppercase">#</th>
                <th className="px-4 py-3 text-left font-semibold text-muted uppercase">JUGADOR</th>
                <th className="px-4 py-3 text-right font-semibold text-muted uppercase">GRAMOS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topPlayers.slice(0, 10).map((p, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-6 h-6 rounded-full bg-brand-pink/10 flex items-center justify-center">
                      <span className="text-brand-pink font-bold text-[10px]">{i + 1}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-text-primary">{p.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-text-primary">{p.grams}g</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Challenges tab
// ─────────────────────────────────────────────────────────────────────────────

function ChallengesTab({ currentChallenge }: { currentChallenge?: WeeklyChallenge }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading]       = useState(false);

  const [desc, setDesc]       = useState('');
  const [reward, setReward]   = useState('');
  const [required, setRequired] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd]     = useState('');

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminCreateChallenge({
        description: desc,
        gramReward: Number(reward),
        requiredPurchases: Number(required),
        weekStart,
        weekEnd,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-gamification-stats'] });
      setCreateOpen(false);
      setDesc('');
      setReward('');
      setRequired('');
      setWeekStart('');
      setWeekEnd('');
    } catch {
      alert('Error al crear desafío.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Current challenge */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-text-primary text-sm">Desafío Actual</h3>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-pink text-white text-xs font-semibold hover:bg-brand-pink/90 transition-colors"
          >
            <Plus size={13} />
            Nuevo desafío
          </button>
        </div>

        {currentChallenge ? (
          <div className="bg-brand-pink/5 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-text-primary">{currentChallenge.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted">
              <span>Recompensa: <span className="font-semibold text-brand-pink">{currentChallenge.gramReward}g</span></span>
              <span>Compras requeridas: <span className="font-semibold">{currentChallenge.requiredPurchases}</span></span>
              <span>
                {new Date(currentChallenge.weekStart).toLocaleDateString('es-CO')} –{' '}
                {new Date(currentChallenge.weekEnd).toLocaleDateString('es-CO')}
              </span>
            </div>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              currentChallenge.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-muted'
            }`}>
              {currentChallenge.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        ) : (
          <p className="text-muted text-sm">No hay desafío activo esta semana.</p>
        )}
      </div>

      {/* Create challenge form (inline expandable) */}
      {createOpen && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-text-primary text-sm">Crear Desafío</h3>
            <button onClick={() => setCreateOpen(false)} className="p-1 text-muted hover:text-text-primary">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Descripción</label>
              <input
                required
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Ej: Compra 3 productos esta semana"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Recompensa (gramos)</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Compras requeridas</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={required}
                  onChange={(e) => setRequired(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Inicio semana</label>
                <input
                  required
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Fin semana</label>
                <input
                  required
                  type="date"
                  value={weekEnd}
                  onChange={(e) => setWeekEnd(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-brand-pink text-white font-semibold text-sm hover:bg-brand-pink/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Crear desafío
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gram Adjustment tab
// ─────────────────────────────────────────────────────────────────────────────

function AdjustTab() {
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [delta, setDelta]   = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: usersRes, isFetching } = useQuery({
    queryKey: ['admin-search-users', userSearch],
    queryFn: () => searchUsers({ search: userSearch }),
    enabled: userSearch.length >= 2,
    staleTime: 10_000,
  });

  const users: User[] = usersRes?.data?.users ?? usersRes?.data ?? [];

  const handleAdjust = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    try {
      await adminAdjustGrams({ userId: selectedUser.id, delta, reason });
      queryClient.invalidateQueries({ queryKey: ['admin-gamification-stats'] });
      alert(`Ajuste de ${delta > 0 ? '+' : ''}${delta}g aplicado a ${selectedUser.name}.`);
      setSelectedUser(null);
      setDelta(1);
      setReason('');
    } catch {
      alert('Error al ajustar gramos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      {/* User search */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
        <h3 className="font-heading font-semibold text-text-primary text-sm">Buscar cliente</h3>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setSelectedUser(null); }}
            placeholder="Nombre, email o teléfono…"
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
          />
          {isFetching && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
          )}
        </div>

        {/* Search results dropdown */}
        {!selectedUser && users.length > 0 && (
          <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => { setSelectedUser(u); setUserSearch(u.name); }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium text-text-primary">{u.name}</p>
                <p className="text-[10px] text-muted">{u.email} · {u.phone}</p>
              </button>
            ))}
          </div>
        )}

        {/* Selected user badge */}
        {selectedUser && (
          <div className="flex items-center gap-3 bg-brand-pink/5 rounded-lg px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-brand-pink flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">
                {selectedUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{selectedUser.name}</p>
              <p className="text-[10px] text-muted">{selectedUser.email}</p>
            </div>
            <button
              onClick={() => { setSelectedUser(null); setUserSearch(''); }}
              className="p-1 text-muted hover:text-text-primary"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Delta stepper + reason + apply */}
      {selectedUser && (
        <form onSubmit={handleAdjust} className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h3 className="font-heading font-semibold text-text-primary text-sm">Ajustar gramos</h3>

          {/* Delta stepper */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setDelta((d) => d - 1)}
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Minus size={14} />
            </button>
            <div className="text-center">
              <span className={`text-2xl font-bold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-500' : 'text-text-primary'}`}>
                {delta > 0 ? '+' : ''}{delta}g
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDelta((d) => d + 1)}
              className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Motivo</label>
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Ajuste por error, premio especial…"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
            />
          </div>

          <button
            type="submit"
            disabled={loading || delta === 0}
            className="w-full py-2.5 rounded-xl bg-brand-pink text-white font-semibold text-sm hover:bg-brand-pink/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Aplicar ajuste
          </button>
        </form>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminGamificationPage() {
  const [tab, setTab] = useState<Tab>('stats');

  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-gamification-stats'],
    queryFn: getGamificationStats,
    staleTime: 60_000,
  });

  const stats: Record<string, unknown> = res?.data ?? {};
  const currentChallenge = stats.currentChallenge as WeeklyChallenge | undefined;

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
      <h1 className="font-heading font-bold text-xl text-text-primary">Gamificación</h1>

      {/* Tab bar */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 w-fit">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              tab === key
                ? 'bg-white text-brand-pink shadow-sm'
                : 'text-muted hover:text-text-primary'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'stats'      && <StatsTab stats={stats} />}
      {tab === 'challenges' && <ChallengesTab currentChallenge={currentChallenge} />}
      {tab === 'adjust'     && <AdjustTab />}
    </div>
  );
}
