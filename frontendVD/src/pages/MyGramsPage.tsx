/**
 * MyGramsPage — Gram wallet: balance, redeem, transaction history, redemption list.
 *
 * Route: /mis-gramos (ProtectedRoute)
 * Data: GET /api/grams/account, GET /api/grams/history, GET /api/redemptions/my
 *       GET /api/essences?active=true (for redeem modal)
 *
 * Sections:
 *  1. Gram balance hero (gradient, jar SVG, stats badges, progress dots)
 *  2. Action card (redeem / play, section header)
 *  3. How to earn grams (collapsible explainer, section header)
 *  4. Transaction history (section header + list)
 *  5. Redemption history (collapsible, section header)
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingBag, Gamepad2, Trophy, Star, Lock,
  ChevronDown, ChevronUp, Gem, ArrowDownCircle, Settings, Minus, Plus,
  Check, Info, List, Package,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  getMyGramAccount, getGramHistory, getMyRedemptions, getEssences, redeemGrams,
} from '../services/api';
import { useToastStore } from '../stores/toastStore';
import type { GramTransaction, EssenceRedemption, Essence } from '../types';
import { AppBar } from '../components/layout/AppBar';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import '../css/MyGramsPage.css';

// ─────────────────────────────────────────────────────────────────────────────
// SVG jar component
// ─────────────────────────────────────────────────────────────────────────────

function GramJar({ fillPct }: { fillPct: number }) {
  const clampedFill = Math.max(0, Math.min(100, fillPct));
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
    queryFn: () => getEssences(),
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
    <div className="grams-modal__overlay" onClick={onClose}>
      <div
        className="grams-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grams-modal__inner">
          <div className="grams-modal__handle" />

          {successData ? (
            /* ── Success state ─── */
            <div className="grams-modal__success">
              <div className="grams-modal__success-icon">
                <Check size={32} />
              </div>
              <p className="grams-modal__success-title">¡Canje registrado!</p>
              <p className="grams-modal__success-desc">
                El equipo de Variedades DANII te contactará para entregar tu esencia.
              </p>
              <p className="grams-modal__success-number">
                Número de canje: <em>#{successData.redemptionNumber}</em>
              </p>
              <button
                onClick={onClose}
                className="grams-modal__success-btn"
              >
                Entendido
              </button>
            </div>
          ) : (
            /* ── Redeem form ─── */
            <>
              <h2 className="grams-modal__title">
                Canjear gramos por esencia
              </h2>

              {/* Gram stepper */}
              <div>
                <p className="grams-modal__label">¿Cuántos gramos canjear?</p>
                <div className="grams-modal__stepper">
                  <button
                    onClick={() => setGrams((g) => Math.max(1, g - 1))}
                    disabled={grams <= 1}
                    className={clsx(
                      'grams-modal__stepper-btn',
                      grams <= 1 ? 'grams-modal__stepper-btn--disabled' : 'grams-modal__stepper-btn--active',
                    )}
                  >
                    <Minus size={18} />
                  </button>
                  <span className="grams-modal__stepper-val">{grams}</span>
                  <button
                    onClick={() => setGrams((g) => Math.min(currentGrams, g + 1))}
                    disabled={grams >= currentGrams}
                    className={clsx(
                      'grams-modal__stepper-btn',
                      grams >= currentGrams ? 'grams-modal__stepper-btn--disabled' : 'grams-modal__stepper-btn--active',
                    )}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <p className="grams-modal__label">
                  {grams}g = {ozPreview} oz de esencia
                </p>
              </div>

              <p className="grams-modal__info-banner">
                Necesitas 13g para 1 oz completa. Puedes canjear fracciones.
              </p>

              {/* Essence selector */}
              <div>
                <p className="grams-modal__field-label">Elige tu esencia:</p>
                <div className="grams-modal__essence-list">
                  {essences.length === 0 && (
                    <p className="grams-modal__label">Cargando esencias...</p>
                  )}
                  {essences.map((ess) => (
                    <button
                      key={ess.id}
                      onClick={() => setSelectedEssence({ id: ess.id, name: ess.name })}
                      className={clsx(
                        'grams-modal__essence-item',
                        selectedEssence?.id === ess.id && 'grams-modal__essence-item--selected',
                      )}
                    >
                      {ess.photoUrl ? (
                        <img src={ess.photoUrl} alt={ess.name} className="grams-modal__essence-img" />
                      ) : (
                        <div className="grams-modal__essence-placeholder">
                          <span>{ess.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="grams-modal__essence-info">
                        <p className="grams-modal__essence-name">{ess.name}</p>
                        {ess.olfactiveFamily && (
                          <span className="grams-modal__essence-family">
                            {ess.olfactiveFamily.name}
                          </span>
                        )}
                      </div>
                      {selectedEssence?.id === ess.id && (
                        <Check size={18} className="grams-section-header__icon" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {selectedEssence && (
                <div className="grams-modal__summary">
                  <div className="grams-modal__summary-row">
                    <span className="grams-modal__summary-label">Canjearás:</span>
                    <span className="grams-modal__summary-value">{grams}g</span>
                  </div>
                  <div className="grams-modal__summary-row">
                    <span className="grams-modal__summary-label">Recibirás:</span>
                    <span className="grams-modal__summary-value">{ozPreview} oz de {selectedEssence.name}</span>
                  </div>
                  <div className="grams-modal__summary-row">
                    <span className="grams-modal__summary-label">Saldo restante:</span>
                    <span className="grams-modal__summary-value" style={{ color: 'var(--grams-gold, #F9A825)' }}>{remainingGrams}g</span>
                  </div>
                </div>
              )}

              {/* Confirm */}
              <button
                onClick={handleConfirm}
                disabled={!selectedEssence || isSubmitting}
                className={clsx(
                  'grams-modal__confirm-btn',
                  (!selectedEssence || isSubmitting) && 'grams-modal__confirm-btn--disabled',
                )}
              >
                {isSubmitting ? (
                  <>
                    <span className="grams-modal__spinner" />
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

const SOURCE_ICON: Record<string, { Icon: React.ElementType; variant: string }> = {
  PRODUCT_PURCHASE:  { Icon: ShoppingBag,     variant: 'pink' },
  ESSENCE_OZ_BONUS:  { Icon: Star,            variant: 'gold' },
  GAME_ROULETTE:     { Icon: Gem,             variant: 'gold' },
  GAME_PUZZLE:       { Icon: Gamepad2,        variant: 'blue' },
  WEEKLY_CHALLENGE:  { Icon: Trophy,          variant: 'gold' },
  MONTHLY_RANKING:   { Icon: Star,            variant: 'gold' },
  ADMIN_ADJUSTMENT:  { Icon: Settings,        variant: 'gray' },
  REDEMPTION:        { Icon: ArrowDownCircle, variant: 'red' },
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
  const totalEarned: number = account?.totalEarned ?? 0;
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
    <div className="grams-page">
      <AppBar title="Mis Gramos" showBack variant='catalog' />

      {/* ── SECTION 1 — Gram balance hero ──────────────────────────────── */}
      <div className="grams-hero">
        {accountLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '8rem' }}>
            <div className="grams-hero__spinner" />
          </div>
        ) : (
          <>
            <div className="grams-hero__jar">
              <GramJar fillPct={fillPct} />
            </div>

            <p className="grams-hero__number">
              {currentGrams}
            </p>
            <p className="grams-hero__label">gramos</p>
            <p className="grams-hero__subtitle">de 13 máximos</p>

            {/* Stats badges row */}
            <div className="grams-hero__stats">
              <span className="grams-hero__stat-badge">
                <Trophy size={12} /> Ganados: <strong>{totalEarned}</strong>
              </span>
              <span className="grams-hero__stat-badge">
                <ArrowDownCircle size={12} /> Canjeados: <strong>{totalRedeemed}</strong>
              </span>
              <span className="grams-hero__stat-badge">
                <ShoppingBag size={12} /> Compras: <strong>{totalPurchases}</strong>
              </span>
            </div>

            {canRedeem && currentGrams > 0 ? (
              <span className="grams-hero__redeem-badge">
                Canje disponible
              </span>
            ) : (
              <div className="grams-hero__purchase-dots">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={clsx(
                      'grams-hero__dot',
                      i < totalPurchases ? 'grams-hero__dot--filled' : 'grams-hero__dot--empty',
                    )}
                  />
                ))}
                <span className="grams-hero__dots-label">
                  Disponible en compra {Math.min(totalPurchases + 1, 5)} de 5
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grams-main">

        {/* ── SECTION 2 — Action card ──────────────────────────────────── */}
        <div className="grams-card">
          <div className="grams-section-header">
            <Gem size={16} className="grams-section-header__icon" strokeWidth={2} />
            <h2 className="grams-section-header__title">Canje</h2>
          </div>

          {canRedeem && currentGrams > 0 ? (
            <button
              onClick={() => setShowRedeem(true)}
              className="grams-actions__redeem-btn"
            >
              Canjear {currentGrams}g por esencia
            </button>
          ) : (
            <button
              disabled
              className="grams-actions__redeem-btn grams-actions__redeem-btn--locked"
            >
              <Lock size={14} />
              Canjea desde tu 5ª compra
            </button>
          )}

          {!canRedeem && purchasesUntilRedeem > 0 && (
            <div className="grams-actions__purchase-dots">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={clsx(
                    'grams-actions__dot',
                    i < totalPurchases ? 'grams-actions__dot--filled' : 'grams-actions__dot--empty',
                  )}
                />
              ))}
              <span className="grams-actions__dots-label">
                {totalPurchases} de 5 compras confirmadas
              </span>
            </div>
          )}

          <Link
            to="/juegos"
            className="grams-actions__play-link"
          >
            Ir a jugar (hasta 4g posibles)
          </Link>
        </div>

        {/* ── SECTION 3 — How to earn grams ─────────────────────────────── */}
        <div className="grams-howto">
          <button
            onClick={() => setHowToExpanded((v) => !v)}
            className="grams-howto__toggle"
          >
            <div className="grams-section-header" style={{ marginBottom: 0, flex: 1 }}>
              <Info size={16} className="grams-section-header__icon" strokeWidth={2} />
              <span className="grams-section-header__title">¿Cómo ganar gramos?</span>
            </div>
            {howToExpanded
              ? <ChevronUp size={16} style={{ color: 'var(--color-muted)' }} />
              : <ChevronDown size={16} style={{ color: 'var(--color-muted)' }} />}
          </button>

          <div className={clsx(
            'grams-howto__body',
            howToExpanded ? 'grams-howto__body--expanded' : 'grams-howto__body--collapsed',
          )}>
            <div className="grams-howto__content">
              <div className="grams-howto__item">
                <ShoppingBag size={18} className="grams-howto__item-icon grams-howto__item-icon--pink" />
                <p className="grams-howto__item-text">+1g por cada loción, crema o shampoo comprado</p>
              </div>
              <div className="grams-howto__item">
                <Gamepad2 size={18} className="grams-howto__item-icon grams-howto__item-icon--blue" />
                <p className="grams-howto__item-text">+1 a 4g jugando en la Sala de Juegos</p>
              </div>
              <div className="grams-howto__item">
                <Trophy size={18} className="grams-howto__item-icon grams-howto__item-icon--gold" />
                <p className="grams-howto__item-text">+Xg completando el reto semanal</p>
              </div>
              <div className="grams-howto__item">
                <Star size={18} className="grams-howto__item-icon grams-howto__item-icon--gold" />
                <p className="grams-howto__item-text">+Xg al estar en el top 10 mensual</p>
              </div>
              {totalRedeemed > 0 && (
                <div className="grams-howto__item">
                  <Gem size={18} className="grams-howto__item-icon grams-howto__item-icon--amber" />
                  <p className="grams-howto__item-text">Al recargar una esencia canjeada también acumulas gramos</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION 4 — Transaction history ──────────────────────────── */}
        <div>
          <div className="grams-section-header">
            <List size={16} className="grams-section-header__icon" strokeWidth={2} />
            <h2 className="grams-section-header__title">Historial de movimientos</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="grams-tx__empty">
              Aún no tienes movimientos. ¡Haz tu primera compra!
            </div>
          ) : (
            <div className="grams-tx__list">
              {visibleTx.map((tx) => {
                const cfg = SOURCE_ICON[tx.sourceType] ?? SOURCE_ICON.ADMIN_ADJUSTMENT;
                const positive = tx.gramsDelta > 0;
                return (
                  <div key={tx.id} className="grams-tx__item">
                    <div className={clsx('grams-tx__icon-wrap', `grams-tx__icon-wrap--${cfg.variant}`)}>
                      <cfg.Icon size={16} />
                    </div>
                    <div className="grams-tx__info">
                      <p className="grams-tx__desc">{tx.description}</p>
                      <p className="grams-tx__date">{formatDate(tx.createdAt)}</p>
                    </div>
                    <span className={clsx(
                      'grams-tx__delta',
                      positive ? 'grams-tx__delta--positive' : 'grams-tx__delta--negative',
                    )}>
                      {positive ? '+' : ''}{tx.gramsDelta}g
                    </span>
                  </div>
                );
              })}

              {transactions.length > 10 && !showAllTx && (
                <button
                  onClick={() => setShowAllTx(true)}
                  className="grams-tx__more-btn"
                >
                  Ver todos ({transactions.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 5 — Redemption history ───────────────────────────── */}
        {redemptions.length > 0 && (
          <div className="grams-redemptions">
            <button
              onClick={() => setRedemptionsExpanded((v) => !v)}
              className="grams-redemptions__toggle"
            >
              <div className="grams-section-header" style={{ marginBottom: 0, flex: 1 }}>
                <Package size={16} className="grams-section-header__icon" strokeWidth={2} />
                <span className="grams-section-header__title">
                  Mis canjes de esencias ({redemptions.length})
                </span>
              </div>
              {redemptionsExpanded
                ? <ChevronUp size={16} style={{ color: 'var(--color-muted)' }} />
                : <ChevronDown size={16} style={{ color: 'var(--color-muted)' }} />}
            </button>

            <div className={clsx(
              'grams-redemptions__body',
              redemptionsExpanded ? 'grams-redemptions__body--expanded' : 'grams-redemptions__body--collapsed',
            )}>
              <div className="grams-redemptions__content">
                {redemptions.map((r) => (
                  <div key={r.id} className="grams-redemptions__item">
                    <p className="grams-redemptions__name">
                      {r.essenceName || 'Esencia pendiente de selección'}
                    </p>
                    <p className="grams-redemptions__detail">{r.ozRedeemed.toFixed(1)} oz · {r.gramsUsed}g</p>
                    <div className="grams-redemptions__footer">
                      <span className={clsx(
                        'grams-redemptions__status',
                        r.status === 'PENDING_DELIVERY' && 'grams-redemptions__status--pending',
                        r.status === 'DELIVERED' && 'grams-redemptions__status--delivered',
                        r.status === 'CANCELLED' && 'grams-redemptions__status--cancelled',
                      )}>
                        {r.status === 'PENDING_DELIVERY' && 'Pendiente de entrega'}
                        {r.status === 'DELIVERED' && 'Entregado'}
                        {r.status === 'CANCELLED' && 'Cancelado'}
                      </span>
                      <span className="grams-redemptions__date">{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

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
