/**
 * ProfilePage.tsx — User profile, loyalty summary, referral code, and settings.
 *
 * Route: /perfil (ProtectedRoute — requires authentication)
 * Backend:
 *   GET  /api/loyalty/account        — live loyalty account data
 *   GET  /api/loyalty/transactions   — paginated points history
 *   GET  /api/loyalty/referral-code  — personal referral code
 *   POST /api/auth/resend-verification
 *   PUT  /api/users/:id              — profile update
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  Trophy,
  Share2,
  Copy,
  Check,
  Pencil,
  AlertTriangle,
  Mail,
  LogOut,
  Package,
  MapPin,
  Bell,
  Recycle,
  RotateCcw,
  X,
  Loader2,
} from 'lucide-react';

import { useAuthStore }         from '../stores/authStore';
import {
  getLoyaltyAccount,
  getLoyaltyTransactions,
  getMyReferralCode,
  resendVerification,
  updateMyProfile,
}                               from '../services/api';
import type { LoyaltyTransaction } from '../types';
import { LoyaltyBadge }         from '../components/loyalty/LoyaltyBadge';
import { AppBar }               from '../components/layout/AppBar';
import { BottomTabBar }         from '../components/layout/BottomTabBar';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Progress bar fill% per loyalty level */
const LEVEL_PROGRESS: Record<string, number> = {
  BASIC: 15,
  PREFERRED: 55,
  VIP: 100,
};

/** Next-level hint text shown under the progress bar */
function levelHint(level: string, points: number): string {
  if (level === 'VIP') return '¡Eres nuestro cliente VIP. Gracias!';
  if (level === 'PREFERRED') {
    const needed = Math.max(0, 500 - (points % 500));
    return `Solo ${needed} puntos para nivel VIP`;
  }
  return 'Realiza 5 compras para nivel Preferencial';
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: PointsHistoryModal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bottom-sheet modal showing paginated loyalty transaction history.
 * GET /api/loyalty/transactions returns paginated history sorted by createdAt DESC.
 */
function PointsHistoryModal({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['loyalty-transactions', page],
    queryFn: () => getLoyaltyTransactions(page),
    staleTime: 60_000,
  });

  // Each page appended onto accumulated list
  const transactions: LoyaltyTransaction[] =
    data?.data?.transactions ?? data?.data ?? [];

  const total: number = data?.data?.total ?? transactions.length;
  const hasMore = transactions.length < total;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-end"
      role="dialog"
      aria-modal="true"
      aria-label="Historial de puntos"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div className="relative w-full max-h-[80vh] bg-surface rounded-t-3xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-brand-gold" />
            <h2 className="font-heading font-bold text-text-primary text-base">
              Historial de Puntos
            </h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1 text-muted hover:text-text-primary">
            <X size={20} />
          </button>
        </div>

        {/* Transaction list */}
        <div className="flex-1 overflow-y-auto px-5 divide-y divide-border">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={28} className="animate-spin text-brand-pink" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-muted text-sm text-center py-10">
              Aún no tienes movimientos de puntos.
            </p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-start justify-between py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary leading-tight truncate">
                    {tx.description}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{formatDate(tx.createdAt)}</p>
                </div>
                <span
                  className={`font-heading font-bold text-sm shrink-0 ${
                    tx.type === 'EARN' ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {tx.type === 'EARN' ? '+' : '-'}{tx.points} pts
                </span>
              </div>
            ))
          )}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={isFetching}
              className="w-full py-3 text-brand-blue text-sm font-medium flex items-center justify-center gap-2"
            >
              {isFetching ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                'Cargar más'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: EditProfileModal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bottom-sheet form for editing name and phone.
 * PUT /api/users/:id — email change NOT allowed self-service (account takeover risk).
 */
function EditProfileModal({ onClose }: { onClose: () => void }) {
  const user       = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName]       = useState(user?.name ?? '');
  const [phone, setPhone]     = useState(user?.phone ?? '');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const phoneValid = /^3\d{9}$/.test(phone);
  const canSave    = name.trim().length > 0 && phoneValid && !saving;

  const handleSave = async () => {
    if (!user) return;
    setError('');
    setSaving(true);
    try {
      const res = await updateMyProfile(user.id, { name: name.trim(), phone });
      const updated = res.data?.user ?? res.data;
      updateUser({ name: updated.name, phone: updated.phone });
      setSuccess(true);
      setTimeout(onClose, 1_200);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax?.response?.data?.message ?? 'Error al guardar cambios.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      role="dialog"
      aria-modal="true"
      aria-label="Editar perfil"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full bg-surface rounded-t-3xl shadow-2xl px-5 pt-5 pb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-bold text-text-primary text-base">Editar Perfil</h2>
          <button onClick={onClose} aria-label="Cerrar"><X size={20} className="text-muted" /></button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-muted block mb-1">Nombre completo</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-brand-pink"
              placeholder="Tu nombre"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs text-muted block mb-1">Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-colors ${
                phone && !phoneValid
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-border focus:border-brand-pink'
              }`}
              placeholder="3XX XXX XXXX"
            />
            {phone && !phoneValid && (
              <p className="text-xs text-red-500 mt-1">10 dígitos colombianos, empieza con 3.</p>
            )}
          </div>

          {/* Email — read-only */}
          {/*
            Email change not allowed self-service to prevent account takeover attacks.
            Users must contact support via WhatsApp to change their email.
          */}
          <div>
            <label className="text-xs text-muted block mb-1">
              Email{' '}
              <span className="text-xs text-muted/70 italic">(Contacta soporte para cambiar)</span>
            </label>
            <input
              value={user?.email ?? ''}
              readOnly
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-muted cursor-not-allowed"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {success && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check size={12} /> Cambios guardados correctamente.
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full py-3.5 rounded-full font-heading font-bold text-sm transition-all ${
              canSave
                ? 'bg-brand-pink text-white shadow-md active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Guardando...
              </span>
            ) : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: LogoutDialog
// ─────────────────────────────────────────────────────────────────────────────

function LogoutDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-xs text-center">
        <LogOut size={32} className="text-brand-pink mx-auto mb-3" />
        <h3 className="font-heading font-bold text-text-primary text-base mb-2">
          ¿Cerrar sesión?
        </h3>
        <p className="text-muted text-sm mb-5">
          Volverás a la pantalla de inicio de sesión.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-border py-2.5 rounded-full text-sm font-medium text-text-primary"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-brand-pink text-white py-2.5 rounded-full text-sm font-bold shadow-md"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfilePage
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate   = useNavigate();
  const user       = useAuthStore((s) => s.user);
  const clearAuth  = useAuthStore((s) => s.clearAuth);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showHistoryModal, setShowHistoryModal]   = useState(false);
  const [showEditModal, setShowEditModal]         = useState(false);
  const [showLogoutDialog, setShowLogoutDialog]   = useState(false);
  const [codeCopied, setCodeCopied]               = useState(false);
  const [resendLoading, setResendLoading]         = useState(false);
  const [resendDone, setResendDone]               = useState(false);
  const [resendError, setResendError]             = useState('');

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: loyaltyRes } = useQuery({
    queryKey: ['loyalty'],
    queryFn: getLoyaltyAccount,
    staleTime: 2 * 60_000,
  });

  const { data: referralRes } = useQuery({
    queryKey: ['referral'],
    queryFn: getMyReferralCode,
    staleTime: 10 * 60_000,
  });

  // Normalise response shapes
  const loyalty = loyaltyRes?.data?.account ?? loyaltyRes?.data;
  const referral = referralRes?.data;

  const currentLevel: 'BASIC' | 'PREFERRED' | 'VIP' =
    loyalty?.level ?? user?.loyaltyAccount?.level ?? 'BASIC';
  const points = loyalty?.points ?? user?.loyaltyAccount?.points ?? 0;
  const bottleReturnsCount = loyalty?.bottleReturnsCount ?? 0;

  // ── Avatar initials ────────────────────────────────────────────────────────
  const initials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? '')
        .join('')
    : '?';

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendError('');
    try {
      await resendVerification();
      setResendDone(true);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setResendError(ax?.response?.data?.message ?? 'Error al reenviar. Intenta más tarde.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2_000);
    });
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/', { replace: true });
  };

  // ── Menu items ─────────────────────────────────────────────────────────────

  const menuItems = [
    { icon: Package, label: 'Mis pedidos',          action: () => navigate('/pedidos'),                  },
    { icon: MapPin,  label: 'Mis direcciones',       action: () => navigate('/perfil/direcciones'),       },
    { icon: Trophy,  label: 'Historial de puntos',   action: () => setShowHistoryModal(true),             },
    { icon: Bell,    label: 'Notificaciones',        action: () => navigate('/perfil/notificaciones'),    },
    { icon: LogOut,  label: 'Cerrar sesión',         action: () => setShowLogoutDialog(true), danger: true },
  ];

  // ── Progress bar ───────────────────────────────────────────────────────────
  const progressPct = LEVEL_PROGRESS[currentLevel] ?? 15;

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <AppBar title="Mi Perfil" showBack />

      <main className="px-4 py-4 pb-28 space-y-4">

        {/* ── SECTION 1: Email verification banner ────────────────────────── */}
        {/*
          Backend blocks login for unverified accounts. This banner handles edge
          cases where a user somehow accessed the profile without verification
          (e.g., token set manually, or email changed by admin).
        */}
        {user && !user.emailVerified && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={18} className="text-orange-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800">
                Verifica tu email para activar tu cuenta completa.
              </p>
              {resendDone ? (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Check size={11} /> Correo enviado a {user.email}.
                </p>
              ) : (
                <>
                  {resendError && (
                    <p className="text-xs text-red-500 mt-1">{resendError}</p>
                  )}
                  <button
                    onClick={handleResendVerification}
                    disabled={resendLoading}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-orange-700 underline underline-offset-2"
                  >
                    {resendLoading ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Mail size={11} />
                    )}
                    Reenviar verificación
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION 2: User card ─────────────────────────────────────────── */}
        {/*
          User data is from authStore.user (persisted, offline-available).
          Edit button opens EditProfileModal (bottom sheet) for immediate in-place edit.
        */}
        <div className="relative bg-linear-to-r from-brand-pink to-brand-pink-dark rounded-2xl p-5 flex items-center gap-4 overflow-hidden">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md">
            <span className="font-heading font-bold text-brand-pink text-lg leading-none">
              {initials}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-white text-base leading-tight truncate">
              {user?.name ?? 'Usuario'}
            </p>
            <p className="text-white/80 text-xs mt-0.5 truncate">{user?.phone}</p>
            <p className="text-white/80 text-xs mt-0.5 truncate">{user?.email}</p>
          </div>

          {/* Edit button */}
          <button
            onClick={() => setShowEditModal(true)}
            aria-label="Editar perfil"
            className="absolute top-3 right-3 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <Pencil size={14} className="text-white" />
          </button>
        </div>

        {/* ── SECTION 3: Loyalty card ───────────────────────────────────────── */}
        <div className="bg-surface rounded-2xl border border-brand-gold/30 shadow-card p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-brand-gold" />
              <span className="font-heading font-semibold text-text-primary text-sm">
                Tu nivel de fidelización
              </span>
            </div>
            <LoyaltyBadge level={currentLevel} size="md" />
          </div>

          {/* Points */}
          <div className="flex items-end gap-2">
            <span className="font-heading font-bold text-brand-gold text-4xl leading-none">
              {points.toLocaleString('es-CO')}
            </span>
            <span className="font-body font-medium text-muted text-base mb-0.5">puntos</span>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[10px] font-semibold text-muted mb-1.5 uppercase tracking-wide">
              <span>Básico</span>
              <span>Preferencial</span>
              <span>VIP</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-pink rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-2">{levelHint(currentLevel, points)}</p>
          </div>

          {/* Benefit pills */}
          <div className="flex gap-2 flex-wrap">
            {(['BASIC', 'PREFERRED', 'VIP'] as const).map((tier, idx) => {
              const labels = ['5% desc.', '8% desc.', 'Envío gratis'];
              const unlocked =
                (currentLevel === 'VIP') ||
                (currentLevel === 'PREFERRED' && idx <= 1) ||
                (currentLevel === 'BASIC' && idx === 0);

              return (
                <span
                  key={tier + idx}
                  className={`text-xs px-3 py-1 rounded-full font-medium border ${
                    unlocked
                      ? 'bg-brand-gold/10 border-brand-gold/40 text-brand-gold'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}
                >
                  {unlocked ? '✓ ' : '🔒 '}{labels[idx]}
                </span>
              );
            })}
          </div>

          {/* History link */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="text-brand-blue text-sm font-medium underline underline-offset-2 flex items-center gap-1"
          >
            <RotateCcw size={13} />
            Ver historial de puntos
          </button>
        </div>

        {/* ── SECTION 4: Referral card ──────────────────────────────────────── */}
        {/*
          Backend POST /api/loyalty/apply-referral is called by NEW users at
          registration, not here. This card only shows the user's own code.
        */}
        <div className="bg-[#E3F2FD] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Share2 size={15} className="text-brand-blue" />
            <span className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">
              Invita y Gana
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-heading font-bold text-2xl text-text-primary tracking-widest">
              {referral?.code ?? '--------'}
            </span>
            <button
              onClick={() => handleCopyCode(referral?.code ?? '')}
              disabled={!referral?.code}
              aria-label="Copiar código"
              className="p-2 bg-white rounded-lg shadow-sm text-brand-blue hover:bg-blue-50 transition-colors"
            >
              {codeCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </button>
          </div>

          {codeCopied && (
            <p className="text-xs text-green-600 font-medium">¡Copiado!</p>
          )}

          {referral?.usages !== undefined && (
            <p className="text-xs text-brand-blue font-medium">
              {referral.usages} {referral.usages === 1 ? 'amigo ha usado' : 'amigos han usado'} tu código
            </p>
          )}

          <p className="text-xs text-muted leading-relaxed">
            Gana{' '}
            <span className="font-semibold text-brand-blue">200 puntos</span> por cada amigo
            que compre su primera fragancia.
          </p>
        </div>

        {/* ── SECTION 5: Eco impact ─────────────────────────────────────────── */}
        {/*
          Eco-gamification element. Each returned bottle saves $2.000 COP and
          grants +200 loyalty points. Bottle return count from loyalty account.
        */}
        {bottleReturnsCount >= 0 && (
          <div className="bg-surface rounded-xl shadow-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Recycle size={18} className="text-green-600" />
              <span className="font-heading font-semibold text-text-primary text-sm">
                Impacto Eco
              </span>
            </div>

            <p className="text-sm text-text-primary mb-2">
              Frascos devueltos:{' '}
              <span className="font-bold text-green-700">{bottleReturnsCount}</span>
            </p>

            {/* Leaf icons: max 10 visible, then "+N más" */}
            <div className="flex flex-wrap gap-1 mb-2">
              {Array.from({ length: Math.min(bottleReturnsCount, 10) }).map((_, i) => (
                <span key={i} className="text-green-600 text-base" aria-hidden>🍃</span>
              ))}
              {bottleReturnsCount > 10 && (
                <span className="text-xs text-green-600 font-semibold self-center">
                  +{bottleReturnsCount - 10} más
                </span>
              )}
            </div>

            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
              <span className="text-xs text-green-700 font-medium">
                Has ahorrado{' '}
                <span className="font-bold">
                  ${(bottleReturnsCount * 2_000).toLocaleString('es-CO')}
                </span>{' '}
                y ayudado al planeta
              </span>
            </div>
          </div>
        )}

        {/* ── SECTION 6: Menu options ───────────────────────────────────────── */}
        <div className="bg-surface rounded-xl shadow-card overflow-hidden divide-y divide-border">
          {menuItems.map(({ icon: Icon, label, action, danger }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-3 px-4 h-14 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <Icon
                size={18}
                className={danger ? 'text-red-400' : 'text-brand-pink'}
              />
              <span
                className={`flex-1 font-body text-sm ${
                  danger ? 'text-red-500' : 'text-text-primary'
                }`}
              >
                {label}
              </span>
              {!danger && <ChevronRight size={16} className="text-muted" />}
            </button>
          ))}
        </div>

      </main>

      <BottomTabBar />

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showHistoryModal && (
        <PointsHistoryModal onClose={() => setShowHistoryModal(false)} />
      )}
      {showEditModal && (
        <EditProfileModal onClose={() => setShowEditModal(false)} />
      )}
      {showLogoutDialog && (
        <LogoutDialog
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutDialog(false)}
        />
      )}
    </div>
  );
}
