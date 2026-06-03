import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Scale, CheckCircle2, Gamepad2, Gift, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { AdminQueryError } from '../../components/admin/AdminQueryError';
import { searchUsers, adminAdjustGrams, getGamificationStats } from '../../services/api';
import '../../css/AdminLoyaltyPage.css';

const REASONS = [
  'Compensación por demora', 'Bono de bienvenida', 'Ajuste manual de gramos',
  'Corrección de error', 'Premio de campaña', 'Deducción por devolución', 'Otro',
];

interface UserHit {
  id: string; name: string; email: string;
  gramAccount?: { currentGrams: number; totalEarned: number; totalRedeemed: number };
}

export default function AdminLoyaltyPage() {
  const { data: statsRes, isError: isStatsError } = useQuery({
    queryKey: ['admin-gamification-stats'], queryFn: getGamificationStats, staleTime: 60_000,
  });
  const stats = statsRes?.data ?? {};

  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserHit | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: usersRes, isError: isUsersError } = useQuery({
    queryKey: ['admin-users-search', userSearch],
    queryFn: () => searchUsers({ search: userSearch }),
    enabled: userSearch.length >= 2, staleTime: 30_000,
  });

  const [grams, setGrams] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (isStatsError || isUsersError) return <AdminQueryError />;

  const userHits: UserHit[] = usersRes?.data?.users ?? usersRes?.data ?? [];

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) { setError('Selecciona un usuario.'); return; }
    const delta = parseInt(grams, 10);
    if (isNaN(delta) || delta === 0) { setError('Ingresa una cantidad de gramos válida (puede ser negativa).'); return; }
    setError(''); setBusy(true);
    try {
      await adminAdjustGrams({ userId: selectedUser.id, delta, reason });
      setSuccess(`✓ ${delta > 0 ? '+' : ''}${delta}g aplicados a ${selectedUser.name}.`);
      setGrams(''); setSelectedUser(null); setUserSearch('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al ajustar los gramos.');
    } finally { setBusy(false); }
  };

  const statCards: { label: string; value: string | number; Icon: React.ElementType; variant: 'emerald' | 'gold' | 'pink' | 'blue' }[] = [
    { label: 'Gramos emitidos', value: stats.totalGramsEarned ?? '—', Icon: TrendingUp, variant: 'emerald' },
    { label: 'Gramos canjeados', value: stats.totalGramsRedeemed ?? '—', Icon: Gift, variant: 'gold' },
    { label: 'Fichas emitidas', value: stats.totalTokensIssued ?? '—', Icon: Gamepad2, variant: 'pink' },
    { label: 'Cuentas activas', value: stats.activeAccounts ?? '—', Icon: Scale, variant: 'blue' },
  ];

  return (
    <div className="admin-loyalty">
      <div className="admin-loyalty__header">
        <h1 className="admin-loyalty__title">Fidelización</h1>
        <p className="admin-loyalty__desc">Gestiona gramos y programa de gamificación</p>
      </div>

      <div className="admin-loyalty__stats-grid">
        {statCards.map(({ label, value, Icon, variant }) => (
          <div key={label} className={clsx("admin-loyalty__stat-card", `admin-loyalty__stat-card--${variant}`)}>
            <div className="admin-loyalty__stat-header">
              <span className="admin-loyalty__stat-label">{label}</span>
              <Icon size={15} className={`admin-loyalty__stat-icon--${variant}`} />
            </div>
            <p className="admin-loyalty__stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div className="admin-loyalty__form-card">
        <div className="admin-loyalty__form-header">
          <h2 className="admin-loyalty__form-title">Ajuste Manual de Gramos</h2>
          <p className="admin-loyalty__form-desc">Ingresa un valor positivo para sumar gramos o negativo para deducir.</p>
        </div>

        <form onSubmit={handleAdjust} className="admin-loyalty__form-body">
          <div className="admin-loyalty__field">
            <label className="admin-loyalty__field-label">Usuario</label>
            <div className="admin-loyalty__search-wrap">
              <Search size={14} className="admin-loyalty__search-icon" />
              <input
                type="text" placeholder="Nombre o correo del cliente…"
                value={selectedUser ? `${selectedUser.name} (${selectedUser.email})` : userSearch}
                onChange={e => { setSelectedUser(null); setUserSearch(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                className="admin-loyalty__field-input admin-loyalty__search-input--with-icon"
              />
              {showDropdown && userHits.length > 0 && !selectedUser && (
                <>
                  <div className="admin-loyalty__search-dropdown-backdrop" onClick={() => setShowDropdown(false)} />
                  <div className="admin-loyalty__search-dropdown">
                    {userHits.slice(0, 8).map(u => (
                      <button key={u.id} type="button" onClick={() => { setSelectedUser(u); setShowDropdown(false); }}
                        className="admin-loyalty__search-item">
                        <div className="admin-loyalty__search-item-avatar">
                          <span className="admin-loyalty__search-item-avatar-text">{u.name.split(' ').slice(0,2).map(w => w[0]).join('')}</span>
                        </div>
                        <div className="admin-loyalty__search-item-info">
                          <p className="admin-loyalty__search-item-name">{u.name}</p>
                          <p className="admin-loyalty__search-item-email">{u.email}</p>
                        </div>
                        {u.gramAccount && <span className="admin-loyalty__search-item-grams">{u.gramAccount.currentGrams}g</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {selectedUser?.gramAccount && (
              <p className="admin-loyalty__selected-info">
                Gramos actuales: <strong>{selectedUser.gramAccount.currentGrams}g</strong>
                {' · Ganados: '}<strong>{selectedUser.gramAccount.totalEarned}g</strong>
                {' · Canjeados: '}<strong>{selectedUser.gramAccount.totalRedeemed}g</strong>
              </p>
            )}
          </div>

          <div className="admin-loyalty__field">
            <label className="admin-loyalty__field-label" htmlFor="adj-grams">Cantidad de gramos</label>
            <input id="adj-grams" type="number" step="1" value={grams} onChange={e => setGrams(e.target.value)}
              placeholder="Ej: 5 para sumar, -3 para deducir" className="admin-loyalty__field-input" />
            {grams && !isNaN(parseInt(grams)) && (
              <p className={clsx("admin-loyalty__field-hint", parseInt(grams) >= 0 ? "admin-loyalty__field-hint--positive" : "admin-loyalty__field-hint--negative")}>
                {parseInt(grams) >= 0 ? `+${grams}g (suma)` : `${grams}g (deducción)`}
              </p>
            )}
          </div>

          <div className="admin-loyalty__field">
            <label className="admin-loyalty__field-label" htmlFor="adj-reason">Motivo</label>
            <select id="adj-reason" value={reason} onChange={e => setReason(e.target.value)} className="admin-loyalty__field-select">
              {REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          {error && <div className="admin-loyalty__error-banner">{error}</div>}
          {success && (
            <div className="admin-loyalty__success-banner">
              <CheckCircle2 size={14} /> {success}
            </div>
          )}

          <button type="submit" disabled={busy || !selectedUser} className="admin-loyalty__submit-btn">
            {busy && <span className="admin-loyalty__submit-spinner" />} Aplicar Ajuste
          </button>
        </form>
      </div>
    </div>
  );
}
