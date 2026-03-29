/**
 * MyGramsPage — Gram wallet: balance, redeem, transaction history, redemption list.
 *
 * Route: /mis-gramos (ProtectedRoute)
 * Data: GET /api/grams/account, GET /api/grams/history, GET /api/redemptions/my
 *       GET /api/essences?active=true (for redeem modal)
 *
 * Sections:
 *  1. Gram balance hero (gradient, jar SVG, progress)
 *  2. Action buttons (redeem / play)
 *  3. How to earn grams (collapsible explainer)
 *  4. Transaction history
 *  5. Redemption history (collapsible)
 */

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Gamepad2, Trophy, Star, Lock,
  ChevronDown, ChevronUp, Gem, ArrowDownCircle, Settings, Minus, Plus,
  Check,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  getMyGramAccount, getGramHistory, getMyRedemptions, getEssences, redeemGrams,
} from '../services/api';
import { useToastStore } from '../stores/toastStore';
import type { GramTransaction, EssenceRedemption, Essence } from '../types';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';

// ─────────────────────────────────────────────────────────────────────────────
// SVG jar component
// ─────────────────────────────────────────────────────────────────────────────

function GramJar({ fillPct }: { fillPct: number }) {
  const clampedFill = Math.max(0, Math.min(100, fillPct));
  // Jar body: viewBox 0 0 80 120. Neck 24-56 y0-20, body rounded rect 8-72 y20-110.
  return (
    <svg viewBox="0 0 80 120" className="w-20 h-28" aria-hidden>
      {/* Jar body outline */}
      <rect x="8" y="20" width="64" height="90" rx="12" fill="rgba(255,255,255,0.15)" />
      {/* Jar neck */}
      <rect x="24" y="4" width="32" height="20" rx="4" fill="rgba(255,255,255,0.15)" />
      {/* Fill clip */}
      <defs>
        <clipPath id="jarClip">
          <rect x="8" y="20" width="64" height="90" rx="12" />
        </clipPath>
      </defs>
      {/* Gold fill (rises from bottom) */}
      <rect
        x="8"
        y={110 - (clampedFill / 100) * 90}
        width="64"
        height={(clampedFill / 100) * 90}
        fill="#F9A825"
        clipPath="url(#jarClip)"
        className="transition-all duration-700"
      />
      {/* Jar body border */}
      <rect x="8" y="20" width="64" height="90" rx="12" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
      <rect x="24" y="4" width="32" height="20" rx="4" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Redeem modal
// ─────────────────────────────────────────────────────────────────────────────

interface RedeemModalProps {
  currentGrams: number;
  onClose: () => void;
  onSuccess: () => void;
}

function RedeemModal({ currentGrams, onClose, onSuccess }: RedeemModalProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [grams, setGrams] = useState(currentGrams);
  const [selectedEssence, setSelectedEssence] = useState<{ id: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ redemptionNumber: string } | null>(null);

  const { data: essRes } = useQuery({
    queryKey: ['essences-active'],
    queryFn: () => getEssences({ active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const essences: Essence[] = useMemo(() => {
    const raw = essRes?.data?.essences ?? essRes?.data ?? [];
    return Array.isArray(raw) ? raw.filter((e: Essence) => e.isActive) : [];
  }, [essRes]);

  const ozPreview = (grams / 13).toFixed(2);
  const remainingGrams = currentGrams - grams;

  const handleConfirm = async () => {
    if (!selectedEssence) return;
    setIsSubmitting(true);
    try {
      const res = await redeemGrams({
        gramsToRedeem: grams,
        essenceName: selectedEssence.name,
        essenceId: selectedEssence.id,
      });
      const num = res.data?.redemptionNumber ?? res.data?.redemption?.id?.slice(0, 8).toUpperCase() ?? '----';
      setSuccessData({ redemptionNumber: num });
      onSuccess();
    } catch {
      addToast('Error al canjear. Intenta nuevamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 font-body" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-surface rounded-t-2xl overflow-y-auto"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          <div className="w-10 h-1 bg-border rounded-full mx-auto" />

          {successData ? (
            /* ── Success state ─── */
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <Check size={32} className="text-emerald-500" />
              </div>
              <p className="font-heading font-bold text-lg text-text-primary">¡Canje registrado!</p>
              <p className="text-sm text-muted">
                El equipo de Variedades DANII te contactará para entregar tu esencia.
              </p>
              <p className="font-body font-medium text-sm text-text-primary">
                Número de canje: <span className="text-brand-pink">#{successData.redemptionNumber}</span>
              </p>
              <button
                onClick={onClose}
                className="bg-brand-pink text-white font-heading font-bold px-8 py-3 rounded-full text-sm"
              >
                Entendido
              </button>
            </div>
          ) : (
            /* ── Redeem form ─── */
            <>
              <h2 className="font-heading font-bold text-base text-text-primary text-center">
                Canjear gramos por esencia
              </h2>

              {/* Gram stepper */}
              <div className="text-center">
                <p className="text-xs text-muted mb-2">¿Cuántos gramos canjear?</p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setGrams((g) => Math.max(1, g - 1))}
                    disabled={grams <= 1}
                    className={clsx(
                      'w-10 h-10 rounded-full border flex items-center justify-center',
                      grams <= 1 ? 'border-border text-border' : 'border-brand-pink text-brand-pink',
                    )}
                  >
                    <Minus size={18} />
                  </button>
                  <span className="font-heading font-bold text-3xl text-brand-gold w-12 text-center">{grams}</span>
                  <button
                    onClick={() => setGrams((g) => Math.min(currentGrams, g + 1))}
                    disabled={grams >= currentGrams}
                    className={clsx(
                      'w-10 h-10 rounded-full border flex items-center justify-center',
                      grams >= currentGrams ? 'border-border text-border' : 'border-brand-pink text-brand-pink',
                    )}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <p className="text-xs text-muted mt-1.5">
                  {grams}g = {ozPreview} oz de esencia
                </p>
              </div>

              <p className="text-[11px] text-muted text-center bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Necesitas 13g para 1 oz completa. Puedes canjear fracciones.
              </p>

              {/* Essence selector */}
              <div>
                <p className="font-body font-medium text-sm text-text-primary mb-2">Elige tu esencia:</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {essences.length === 0 && (
                    <p className="text-sm text-muted text-center py-3">Cargando esencias...</p>
                  )}
                  {essences.map((ess) => (
                    <button
                      key={ess.id}
                      onClick={() => setSelectedEssence({ id: ess.id, name: ess.name })}
                      className={clsx(
                        'w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                        selectedEssence?.id === ess.id
                          ? 'border-brand-pink bg-brand-pink/5'
                          : 'border-border bg-surface',
                      )}
                    >
                      {ess.photoUrl ? (
                        <img src={ess.photoUrl} alt={ess.name} className="w-10 h-10 rounded-lg object-cover flex-none" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-brand-pink/5 flex items-center justify-center flex-none">
                          <span className="font-heading font-bold text-brand-pink/30">{ess.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-medium text-sm text-text-primary truncate">{ess.name}</p>
                        {ess.olfactiveFamily && (
                          <span className="text-[10px] bg-background text-muted px-1.5 py-0.5 rounded">
                            {ess.olfactiveFamily.name}
                          </span>
                        )}
                      </div>
                      {selectedEssence?.id === ess.id && (
                        <Check size={18} className="text-brand-pink flex-none" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {selectedEssence && (
                <div className="bg-background rounded-xl p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Canjearás:</span>
                    <span className="font-bold text-text-primary">{grams}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Recibirás:</span>
                    <span className="font-bold text-text-primary">{ozPreview} oz de {selectedEssence.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Saldo restante:</span>
                    <span className="font-bold text-brand-gold">{remainingGrams}g</span>
                  </div>
                </div>
              )}

              {/* Confirm */}
              <button
                onClick={handleConfirm}
                disabled={!selectedEssence || isSubmitting}
                className={clsx(
                  'w-full py-3.5 rounded-full font-heading font-bold text-sm text-white flex items-center justify-center gap-2',
                  !selectedEssence || isSubmitting
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-brand-pink active:bg-brand-pink/80',
                )}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar canje'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Source type icon helper
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_ICON: Record<string, { Icon: React.ElementType; color: string }> = {
  PRODUCT_PURCHASE:  { Icon: ShoppingBag,     color: 'text-brand-pink bg-brand-pink/10' },
  ESSENCE_OZ_BONUS:  { Icon: Star,            color: 'text-brand-gold bg-amber-50' },
  GAME_ROULETTE:     { Icon: Gem,             color: 'text-brand-gold bg-amber-50' },
  GAME_PUZZLE:       { Icon: Gamepad2,        color: 'text-blue-500 bg-blue-50' },
  WEEKLY_CHALLENGE:  { Icon: Trophy,          color: 'text-brand-gold bg-amber-50' },
  MONTHLY_RANKING:   { Icon: Star,            color: 'text-brand-gold bg-amber-50' },
  ADMIN_ADJUSTMENT:  { Icon: Settings,        color: 'text-gray-400 bg-gray-100' },
  REDEMPTION:        { Icon: ArrowDownCircle, color: 'text-red-400 bg-red-50' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function MyGramsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: accountRes, isLoading: accountLoading } = useQuery({
    queryKey: ['gram-account'],
    queryFn: getMyGramAccount,
    staleTime: 60_000,
  });

  const { data: historyRes } = useQuery({
    queryKey: ['gram-history'],
    queryFn: () => getGramHistory(1),
    staleTime: 60_000,
  });

  const { data: redemptionsRes } = useQuery({
    queryKey: ['my-redemptions'],
    queryFn: getMyRedemptions,
    staleTime: 60_000,
  });

  const account = accountRes?.data?.account ?? accountRes?.data;
  const currentGrams: number = account?.currentGrams ?? 0;
  const totalPurchases: number = account?.totalPurchases ?? 0;
  const canRedeem: boolean = account?.canRedeem ?? false;
  const totalRedeemed: number = account?.totalRedeemed ?? 0;

  const transactions: GramTransaction[] = historyRes?.data?.transactions ?? historyRes?.data ?? [];
  const redemptions: EssenceRedemption[] = redemptionsRes?.data?.redemptions ?? redemptionsRes?.data ?? [];

  // ── UI state ────────────────────────────────────────────────────────────
  const [showRedeem, setShowRedeem] = useState(false);
  const [howToExpanded, setHowToExpanded] = useState(false);
  const [redemptionsExpanded, setRedemptionsExpanded] = useState(false);
  const [showAllTx, setShowAllTx] = useState(false);

  const fillPct = (currentGrams / 13) * 100;
  const visibleTx = showAllTx ? transactions : transactions.slice(0, 10);

  const purchasesUntilRedeem = Math.max(0, 5 - totalPurchases);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background font-body pb-24">
      <AppBar title="Mis Gramos" showBack />

      {/* ── SECTION 1 — Gram balance hero ──────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-pink to-brand-pink/80 px-6 pt-8 pb-10 text-center">
        {accountLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-3">
              <GramJar fillPct={fillPct} />
            </div>

            <p className="font-heading font-extrabold text-[72px] leading-none text-white">
              {currentGrams}
            </p>
            <p className="text-white text-lg mt-1 font-body">gramos</p>
            <p className="text-white/70 text-sm mt-0.5">de 13 máximos</p>

            {canRedeem && currentGrams > 0 ? (
              <span className="inline-block mt-3 bg-emerald-400 text-white font-body font-semibold text-xs px-4 py-1.5 rounded-full">
                Canje disponible
              </span>
            ) : (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={clsx(
                      'w-2.5 h-2.5 rounded-full',
                      i < totalPurchases ? 'bg-white' : 'bg-white/30',
                    )}
                  />
                ))}
                <span className="text-white/60 text-xs ml-1.5">
                  Disponible en compra {Math.min(totalPurchases + 1, 5)} de 5
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <main className="px-4 -mt-5 space-y-4">

        {/* ── SECTION 2 — Action buttons ───────────────────────────────── */}
        <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
          {canRedeem && currentGrams > 0 ? (
            <button
              onClick={() => setShowRedeem(true)}
              className="w-full py-3.5 rounded-full bg-brand-pink text-white font-heading font-bold text-sm"
            >
              Canjear {currentGrams}g por esencia
            </button>
          ) : (
            <button
              disabled
              className="w-full py-3.5 rounded-full bg-gray-200 text-gray-400 font-heading font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Lock size={14} />
              Canjea desde tu 5ª compra
            </button>
          )}

          {!canRedeem && purchasesUntilRedeem > 0 && (
            <div className="flex items-center justify-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={clsx(
                    'w-2 h-2 rounded-full',
                    i < totalPurchases ? 'bg-brand-pink' : 'bg-gray-200',
                  )}
                />
              ))}
              <span className="text-xs text-muted ml-1">
                {totalPurchases} de 5 compras confirmadas
              </span>
            </div>
          )}

          <Link
            to="/juegos"
            className="block w-full py-3 rounded-full border-2 border-brand-pink text-brand-pink font-heading font-bold text-sm text-center"
          >
            Ir a jugar (hasta 4g posibles)
          </Link>
        </div>

        {/* ── SECTION 3 — How to earn grams ─────────────────────────────── */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => setHowToExpanded((v) => !v)}
            className="w-full flex items-center justify-between p-4"
          >
            <span className="font-heading font-semibold text-sm text-text-primary">
              ¿Cómo ganar gramos?
            </span>
            {howToExpanded
              ? <ChevronUp size={16} className="text-muted" />
              : <ChevronDown size={16} className="text-muted" />}
          </button>

          <div className={clsx(
            'overflow-hidden transition-all duration-300',
            howToExpanded ? 'max-h-80' : 'max-h-0',
          )}>
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-start gap-3">
                <ShoppingBag size={18} className="text-brand-pink flex-none mt-0.5" />
                <p className="text-sm text-muted">+1g por cada loción, crema o shampoo comprado</p>
              </div>
              <div className="flex items-start gap-3">
                <Gamepad2 size={18} className="text-blue-500 flex-none mt-0.5" />
                <p className="text-sm text-muted">+1 a 4g jugando en la Sala de Juegos</p>
              </div>
              <div className="flex items-start gap-3">
                <Trophy size={18} className="text-brand-gold flex-none mt-0.5" />
                <p className="text-sm text-muted">+Xg completando el reto semanal</p>
              </div>
              <div className="flex items-start gap-3">
                <Star size={18} className="text-brand-gold flex-none mt-0.5" />
                <p className="text-sm text-muted">+Xg al estar en el top 10 mensual</p>
              </div>
              {totalRedeemed > 0 && (
                <div className="flex items-start gap-3">
                  <Gem size={18} className="text-amber-500 flex-none mt-0.5" />
                  <p className="text-sm text-muted">Al recargar una esencia canjeada también acumulas gramos</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION 4 — Transaction history ──────────────────────────── */}
        <div className="space-y-3">
          <h2 className="font-heading font-bold text-base text-text-primary">
            Historial de movimientos
          </h2>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted">
                Aún no tienes movimientos. ¡Haz tu primera compra!
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {visibleTx.map((tx) => {
                  const cfg = SOURCE_ICON[tx.sourceType] ?? SOURCE_ICON.ADMIN_ADJUSTMENT;
                  const positive = tx.gramsDelta > 0;
                  return (
                    <div key={tx.id} className="bg-surface rounded-xl border border-border p-3.5 flex items-center gap-3">
                      <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center flex-none', cfg.color)}>
                        <cfg.Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm text-text-primary truncate">{tx.description}</p>
                        <p className="font-body text-[11px] text-muted">{formatDate(tx.createdAt)}</p>
                      </div>
                      <span className={clsx(
                        'font-heading font-bold text-base flex-none',
                        positive ? 'text-emerald-500' : 'text-red-400',
                      )}>
                        {positive ? '+' : ''}{tx.gramsDelta}g
                      </span>
                    </div>
                  );
                })}
              </div>

              {transactions.length > 10 && !showAllTx && (
                <button
                  onClick={() => setShowAllTx(true)}
                  className="w-full text-center text-sm text-brand-pink font-body font-medium py-2"
                >
                  Ver todos ({transactions.length})
                </button>
              )}
            </>
          )}
        </div>

        {/* ── SECTION 5 — Redemption history ───────────────────────────── */}
        {redemptions.length > 0 && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setRedemptionsExpanded((v) => !v)}
              className="w-full flex items-center justify-between p-4"
            >
              <span className="font-heading font-semibold text-sm text-text-primary">
                Mis canjes de esencias ({redemptions.length})
              </span>
              {redemptionsExpanded
                ? <ChevronUp size={16} className="text-muted" />
                : <ChevronDown size={16} className="text-muted" />}
            </button>

            <div className={clsx(
              'overflow-hidden transition-all duration-300',
              redemptionsExpanded ? 'max-h-[600px]' : 'max-h-0',
            )}>
              <div className="px-4 pb-4 space-y-3">
                {redemptions.map((r) => (
                  <div key={r.id} className="bg-background rounded-xl p-3.5 space-y-1.5">
                    <p className="font-body font-medium text-sm text-text-primary">
                      {r.essenceName || 'Esencia pendiente de selección'}
                    </p>
                    <p className="text-xs text-muted">{r.ozRedeemed.toFixed(1)} oz · {r.gramsUsed}g</p>
                    <div className="flex items-center justify-between">
                      <span className={clsx(
                        'text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full',
                        r.status === 'PENDING_DELIVERY' && 'bg-orange-100 text-orange-600',
                        r.status === 'DELIVERED' && 'bg-emerald-100 text-emerald-600',
                        r.status === 'CANCELLED' && 'bg-gray-100 text-gray-500',
                      )}>
                        {r.status === 'PENDING_DELIVERY' && 'Pendiente de entrega'}
                        {r.status === 'DELIVERED' && 'Entregado'}
                        {r.status === 'CANCELLED' && 'Cancelado'}
                      </span>
                      <span className="text-[11px] text-muted">{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── Redeem modal ───────────────────────────────────────────────── */}
      {showRedeem && (
        <RedeemModal
          currentGrams={currentGrams}
          onClose={() => setShowRedeem(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['gram-account'] });
            queryClient.invalidateQueries({ queryKey: ['gram-history'] });
            queryClient.invalidateQueries({ queryKey: ['my-redemptions'] });
          }}
        />
      )}

      <BottomTabBar />
    </div>
  );
}
