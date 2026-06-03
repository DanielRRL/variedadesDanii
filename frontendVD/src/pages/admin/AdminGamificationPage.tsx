/**
 * AdminGamificationPage — 3-tab panel for gamification management.
 *
 * Tabs:
 *  1. Estadísticas — 4 stat cards + top 10 players
 *  2. Desafíos Semanales — current challenge + create form
 *  3. Ajuste de Gramos — search user + manual adjustment
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Gem, Gift, Gamepad2, Clock, Trophy, Scale, Search, X, Plus, Minus, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { AdminQueryError } from '../../components/admin/AdminQueryError';
import { useToastStore } from '../../stores/toastStore';
import { getGamificationStats, searchUsers, adminAdjustGrams, adminCreateChallenge } from '../../services/api';
import type { WeeklyChallenge, User } from '../../types';
import '../../css/AdminGamificationPage.css';

// ─── StatCard ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, iconVariant }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; iconVariant: 'pink' | 'gold' | 'green' | 'blue';
}) {
  return (
    <div className="admin-gamification__stat-card">
      <div className="admin-gamification__stat-top">
        <div className={clsx('admin-gamification__stat-icon-wrap', `admin-gamification__stat-icon-wrap--${iconVariant}`)}>
          <Icon size={16} />
        </div>
        <div className="admin-gamification__stat-info">
          <p className="admin-gamification__stat-label">{label}</p>
          <p className="admin-gamification__stat-value">{value}</p>
        </div>
      </div>
      {sub && <p className="admin-gamification__stat-sub">{sub}</p>}
    </div>
  );
}

// ─── StatsTab ────────────────────────────────────────────────────────────────

function StatsTab({ stats, topPlayers }: { stats: Record<string, number>; topPlayers: { name: string; grams: number }[] }) {
  return (
    <>
      <div className="admin-gamification__stats-grid">
        <StatCard icon={Gem} label="Gramos Emitidos" value={`${Number(stats.totalGramsIssued ?? 0)}g`} sub="Total acumulado" iconVariant="pink" />
        <StatCard icon={Gift} label="Gramos Canjeados" value={`${Number(stats.totalGramsRedeemed ?? 0)}g`} sub="En canjes entregados" iconVariant="gold" />
        <StatCard icon={Clock} label="Fichas Activas" value={Number(stats.activeTokens ?? 0)} sub="Sin jugar aún" iconVariant="green" />
        <StatCard icon={Gamepad2} label="Juegos Realizados" value={Number(stats.completedGames ?? 0)} sub="Total histórico" iconVariant="blue" />
      </div>

      <div className="admin-gamification__players-card">
        <div className="admin-gamification__players-header">
          <h3 className="admin-gamification__players-title">Top 10 Jugadores</h3>
        </div>
        {topPlayers.length === 0 ? (
          <p className="admin-gamification__players-empty">Sin datos de jugadores aún.</p>
        ) : (
          <table className="admin-gamification__players-table">
            <thead><tr>{['#','JUGADOR','GRAMOS'].map(h => <th key={h} className="admin-gamification__players-th">{h}</th>)}</tr></thead>
            <tbody className="admin-gamification__players-tbody">
              {topPlayers.map((p, i) => (
                <tr key={i}>
                  <td className="admin-gamification__players-td"><span className="admin-gamification__players-td-rank">{i + 1}</span></td>
                  <td className="admin-gamification__players-td"><span className="admin-gamification__players-td-name">{p.name}</span></td>
                  <td className="admin-gamification__players-td"><span className="admin-gamification__players-td-grams">{p.grams}g</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ─── ChallengesTab ───────────────────────────────────────────────────────────

function ChallengesTab({ currentChallenge, onInvalidate }: { currentChallenge: WeeklyChallenge | undefined; onInvalidate: () => void }) {
  const addToast = useToastStore(s => s.addToast);
  const [createOpen, setCreateOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [reward, setReward] = useState('');
  const [purchases, setPurchases] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseInt(reward), p = parseInt(purchases);
    if (!r || !p || !desc.trim() || !weekStart || !weekEnd) return;
    setBusy(true);
    try {
      await adminCreateChallenge({ description: desc, gramReward: r, requiredPurchases: p, weekStart, weekEnd });
      onInvalidate();
      setCreateOpen(false); setDesc(''); setReward(''); setPurchases(''); setWeekStart(''); setWeekEnd('');
    } catch { addToast('Error al crear desafío.', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="admin-gamification__challenge-card">
        <div className="admin-gamification__challenge-header">
          <h3 className="admin-gamification__challenge-title">Desafío Actual</h3>
          {!createOpen && (
            <button onClick={() => setCreateOpen(true)} className="admin-gamification__challenge-create-btn">
              <Trophy size={14} /> Nuevo desafío
            </button>
          )}
        </div>
        {currentChallenge ? (
          <>
            <p className="admin-gamification__challenge-desc">{currentChallenge.description}</p>
            <div className="admin-gamification__challenge-meta">
              <span>Premio: <strong>{currentChallenge.gramReward}g</strong></span>
              <span>Compras requeridas: <strong>{currentChallenge.requiredPurchases}</strong></span>
            </div>
            <p className="admin-gamification__challenge-dates">
              {new Date(currentChallenge.weekStart).toLocaleDateString('es-CO')} — {new Date(currentChallenge.weekEnd).toLocaleDateString('es-CO')}
            </p>
            <span className={clsx('admin-gamification__challenge-badge', currentChallenge.active ? 'admin-gamification__challenge-badge--active' : 'admin-gamification__challenge-badge--inactive')}>
              {currentChallenge.active ? 'Activo' : 'Inactivo'}
            </span>
          </>
        ) : (
          <p className="admin-gamification__challenge-empty">No hay desafío activo esta semana.</p>
        )}
      </div>

      {createOpen && (
        <div className="admin-gamification__form-card">
          <div className="admin-gamification__form-header">
            <h3 className="admin-gamification__form-title">Crear Desafío</h3>
            <button onClick={() => setCreateOpen(false)} className="admin-gamification__form-close"><X size={16} /></button>
          </div>
          <form onSubmit={handleCreate} className="admin-gamification__form-body">
            <div className="admin-gamification__form-field">
              <label className="admin-gamification__form-label">Descripción</label>
              <input required value={desc} onChange={e => setDesc(e.target.value)} className="admin-gamification__form-input" placeholder="Ej: Compra 3 productos esta semana" />
            </div>
            <div className="admin-gamification__form-row">
              <div className="admin-gamification__form-field">
                <label className="admin-gamification__form-label">Premio (gramos)</label>
                <input required type="number" min={1} value={reward} onChange={e => setReward(e.target.value)} className="admin-gamification__form-input" />
              </div>
              <div className="admin-gamification__form-field">
                <label className="admin-gamification__form-label">Compras requeridas</label>
                <input required type="number" min={1} value={purchases} onChange={e => setPurchases(e.target.value)} className="admin-gamification__form-input" />
              </div>
            </div>
            <div className="admin-gamification__form-row">
              <div className="admin-gamification__form-field">
                <label className="admin-gamification__form-label">Inicio de semana</label>
                <input type="date" required value={weekStart} onChange={e => setWeekStart(e.target.value)} className="admin-gamification__form-input" />
              </div>
              <div className="admin-gamification__form-field">
                <label className="admin-gamification__form-label">Fin de semana</label>
                <input type="date" required value={weekEnd} onChange={e => setWeekEnd(e.target.value)} className="admin-gamification__form-input" />
              </div>
            </div>
            <button type="submit" disabled={busy} className="admin-gamification__form-submit">
              {busy && <span className="admin-gamification__adjust-spinner" />} Crear desafío
            </button>
          </form>
        </div>
      )}
    </>
  );
}

// ─── AdjustTab ───────────────────────────────────────────────────────────────

function AdjustTab({ onInvalidate }: { onInvalidate: () => void }) {
  const addToast = useToastStore(s => s.addToast);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: usersRes, isError, isFetching } = useQuery({
    queryKey: ['admin-search-users', userSearch],
    queryFn: () => searchUsers({ search: userSearch }),
    enabled: userSearch.length >= 2, staleTime: 10_000,
  });

  if (isError) return <AdminQueryError />;

  const users: User[] = usersRes?.data?.users ?? usersRes?.data ?? [];

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || delta === 0) return;
    setBusy(true);
    try {
      await adminAdjustGrams({ userId: selectedUser.id, delta, reason: reason || 'Ajuste manual de gramos' });
      addToast(`Ajuste de ${delta > 0 ? '+' : ''}${delta}g aplicado a ${selectedUser.name}.`, 'success');
      onInvalidate(); setSelectedUser(null); setUserSearch(''); setDelta(0); setReason('');
    } catch { addToast('Error al ajustar gramos.', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="admin-gamification__search-card">
      <div className="admin-gamification__search-wrap">
        <Search size={15} className="admin-gamification__search-icon" />
        <input
          value={selectedUser ? `${selectedUser.name} (${selectedUser.email})` : userSearch}
          onChange={e => { setSelectedUser(null); setUserSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Buscar cliente…" className="admin-gamification__search-input"
        />
        {isFetching && <Loader2 size={14} className="admin-gamification__search-spinner" />}
        {showDropdown && users.length > 0 && !selectedUser && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowDropdown(false)} />
            <div className="admin-gamification__search-dropdown">
              {users.slice(0, 8).map(u => (
                <button key={u.id} type="button" onClick={() => { setSelectedUser(u); setShowDropdown(false); }}
                  className="admin-gamification__search-item">
                  <div>
                    <p className="admin-gamification__search-item-name">{u.name}</p>
                    <p className="admin-gamification__search-item-email">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedUser && (
        <>
          <div className="admin-gamification__selected-badge">
            <div className="admin-gamification__selected-avatar">
              <span className="admin-gamification__selected-avatar-text">{selectedUser.name.split(' ').slice(0,2).map(w => w[0]).join('')}</span>
            </div>
            <div className="admin-gamification__selected-info">
              <p className="admin-gamification__selected-name">{selectedUser.name}</p>
              <p className="admin-gamification__selected-email">{selectedUser.email}</p>
            </div>
            <button onClick={() => { setSelectedUser(null); setDelta(0); }} className="admin-gamification__selected-clear"><X size={14} /></button>
          </div>

          <form onSubmit={handleAdjust} className="admin-gamification__adjust-form">
            <div className="admin-gamification__form-field">
              <label className="admin-gamification__form-label">Gramos a ajustar</label>
              <div className="admin-gamification__adjust-stepper">
                <button type="button" onClick={() => setDelta(d => d - 1)} disabled={delta <= -99} className="admin-gamification__adjust-stepper-btn"><Minus size={14} /></button>
                <span className="admin-gamification__adjust-stepper-value">{delta > 0 ? '+' : ''}{delta}g</span>
                <button type="button" onClick={() => setDelta(d => d + 1)} disabled={delta >= 99} className="admin-gamification__adjust-stepper-btn"><Plus size={14} /></button>
              </div>
            </div>
            <div className="admin-gamification__form-field">
              <label className="admin-gamification__form-label">Motivo</label>
              <input value={reason} onChange={e => setReason(e.target.value)} className="admin-gamification__adjust-reason" placeholder="Motivo del ajuste…" />
            </div>
            <button type="submit" disabled={busy || delta === 0} className="admin-gamification__adjust-submit">
              {busy && <span className="admin-gamification__adjust-spinner" />} Aplicar Ajuste
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const TABS: { key: 'stats' | 'challenges' | 'adjust'; label: string; Icon: React.ElementType }[] = [
  { key: 'stats', label: 'Estadísticas', Icon: BarChart3 },
  { key: 'challenges', label: 'Desafíos Semanales', Icon: Trophy },
  { key: 'adjust', label: 'Ajuste de Gramos', Icon: Scale },
];

export default function AdminGamificationPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'stats' | 'challenges' | 'adjust'>('stats');

  const { data: statsRes, isLoading, isError } = useQuery({
    queryKey: ['admin-gamification-stats'],
    queryFn: getGamificationStats, staleTime: 60_000,
  });

  if (isError) return <AdminQueryError />;

  const stats = statsRes?.data ?? {};
  const topPlayers: { name: string; grams: number }[] = stats.topPlayers ?? [];
  const currentChallenge: WeeklyChallenge | undefined = stats.currentChallenge ?? stats.activeChallenge ?? undefined;

  if (isLoading) {
    return <div className="admin-gamification__loading"><div className="admin-gamification__spinner" /></div>;
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-gamification-stats'] });

  return (
    <div className="admin-gamification">
      <div className="admin-gamification__header">
        <h1 className="admin-gamification__title">Gamificación</h1>
      </div>

      <div className="admin-gamification__tabs">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx('admin-gamification__tab', tab === key && 'admin-gamification__tab--active')}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <StatsTab stats={stats} topPlayers={topPlayers} />}
      {tab === 'challenges' && <ChallengesTab currentChallenge={currentChallenge} onInvalidate={invalidate} />}
      {tab === 'adjust' && <AdjustTab onInvalidate={invalidate} />}
    </div>
  );
}
