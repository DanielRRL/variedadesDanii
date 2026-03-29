/**
 * EssenceDetailPage — Order configurator for a single perfume essence.
 * Route: /esencia/:id
 *
 * Critical conversion screen. Every interaction updates price totals in real-time.
 *
 * Sections:
 *  1. Image header          — full-width hero with back / heart / share actions
 *  2. Product info          — name, rating, family, inspiration, stock
 *  3. Oz selector           — 3 preset cards + custom input. Drives ALL price calcs.
 *  4. Bottle type selector  — own / standard / luxury. Drives bottlePrice.
 *  5. Return bottle toggle  — only shown when a paid bottle is selected.
 *  6. Points preview        — gamification hook (auth only).
 *  7. Total display         — real-time breakdown.
 *  8. Add-to-cart button    — writes to cartStore. No API call at this stage.
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Heart, Share2, Star,
  TestTube, FlaskConical, Trophy,
  ShoppingCart, AlertCircle, RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getEssenceById, getBottles } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { StockIndicator } from '../components/catalog/StockIndicator';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import { formatCOP } from '../utils/format';
import {
  OZ_TO_ML,
  calculateEssencePrice,
  calculateOzOptions,
  calculateLineTotal,
  calculatePointsPreview,
} from '../utils/priceCalculator';
import type { Essence } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fallback bottle prices in COP.
 * The backend Bottle model does not have a price field yet — it lives on Product.
 * These constants are used until the API is extended to return prices per bottle.
 */
const BOTTLE_PRICE_STANDARD = 8_000;
const BOTTLE_PRICE_LUXURY   = 15_000;

/**
 * Return discount in COP awarded when the customer brings back a bottle.
 * Matches the value shown throughout the app ("AHORRAS: $2.000").
 * Backend endpoint: POST /api/returns — admin applies the discount after
 * verifying the bottle is in good condition.
 */
const RETURN_DISCOUNT_COP = 2_000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BottleChoice = 'own' | 'standard' | 'luxury';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve bottle price from choice.
 * "own bottle" = $0 (customer provides the container).
 * STANDARD / LUXURY prices come from constants above until API provides them.
 */
function resolveBottlePrice(choice: BottleChoice): number {
  if (choice === 'standard') return BOTTLE_PRICE_STANDARD;
  if (choice === 'luxury')   return BOTTLE_PRICE_LUXURY;
  return 0;
}

/** Label shown next to each bottle radio button. */
function resolveBottleLabel(choice: BottleChoice): string {
  if (choice === 'standard') return `Frasco estándar — ${formatCOP(BOTTLE_PRICE_STANDARD)}`;
  if (choice === 'luxury')   return `Frasco premium — ${formatCOP(BOTTLE_PRICE_LUXURY)}`;
  return 'Usar mi propio frasco';
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast (inline, no external lib needed)
// ─────────────────────────────────────────────────────────────────────────────

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'info';
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StarRating({ rating = 0, reviewCount = 0 }: { rating?: number; reviewCount?: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="relative inline-flex">
          <Star size={14} className="text-border" strokeWidth={1.5} />
          {rating >= i + 1 && (
            <span className="absolute inset-0">
              <Star size={14} className="text-brand-gold fill-brand-gold" strokeWidth={1.5} />
            </span>
          )}
          {rating >= i + 0.5 && rating < i + 1 && (
            <span className="absolute inset-0 overflow-hidden w-1/2">
              <Star size={14} className="text-brand-gold fill-brand-gold" strokeWidth={1.5} />
            </span>
          )}
        </span>
      ))}
      {reviewCount > 0 && (
        <span className="text-[12px] text-muted font-body ml-1">
          {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'reseña' : 'reseñas'})
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function EssenceDetailPage() {
  const { id }        = useParams<{ id: string }>();
  const navigate      = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addItem       = useCartStore((s) => s.addItem);

  // ── Toast state ───────────────────────────────────────────────────────────
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500);
  };

  // ── Configurator state ────────────────────────────────────────────────────

  /**
   * selectedOz: how many fluid ounces the customer wants.
   * Changed by pressing a preset card OR typing in the custom input.
   * Drives ALL downstream price calculations.
   * OZ_TO_ML = 29.5735. Backend CreateOrderUseCase uses mlQuantity = oz * OZ_TO_ML.
   */
  const [selectedOz,    setSelectedOz]    = useState<number>(1);
  const [customOz,      setCustomOz]      = useState<string>('');
  const [useCustom,     setUseCustom]     = useState(false);

  /**
   * bottleChoice: which bottle option the customer selected.
   * 'own'      → bottlePrice = 0, bottleId = null
   * 'standard' → bottlePrice = BOTTLE_PRICE_STANDARD (GET /api/bottles?type=STANDARD)
   * 'luxury'   → bottlePrice = BOTTLE_PRICE_LUXURY   (GET /api/bottles?type=LUXURY)
   */
  const [bottleChoice,  setBottleChoice]  = useState<BottleChoice>('standard');

  /**
   * returnsBottle: customer promises to return the bottle for the discount.
   * Backend field: isBottleReturn: boolean in CreateOrderInput.
   * If true AND frasco is returned in good state, admin applies discount via POST /api/returns.
   * Only shown when bottleChoice !== 'own' (no bottle to return).
   */
  const [returnsBottle, setReturnsBottle] = useState(false);

  // ── Fetch essence detail: GET /api/essences/:id ──────────────────────────
  const {
    data:      essenceRes,
    isLoading: essenceLoading,
    isError:   essenceError,
    refetch:   refetchEssence,
  } = useQuery({
    queryKey: ['essence', id],
    queryFn:  () => getEssenceById(id!),
    enabled:  !!id,
    staleTime: 5 * 60 * 1000,
  });

  const essence: Essence | null = essenceRes?.data ?? null;

  // ── Fetch bottles: GET /api/bottles ─────────────────────────────────────
  // Used to get the real bottleId to pass to cartStore.addItem.
  // Prices are resolved from constants (BOTTLE_PRICE_STANDARD / LUXURY)
  // because the backend Bottle model doesn't expose a price field yet.
  const { data: bottlesRes } = useQuery({
    queryKey: ['bottles'],
    queryFn:  getBottles,
    staleTime: 10 * 60 * 1000,
  });
  const bottlesList: Array<{ id: string; type: string; name: string }> =
    Array.isArray(bottlesRes?.data) ? bottlesRes.data : [];

  const resolvedBottleId = useMemo(() => {
    if (bottleChoice === 'own') return null;
    const match = bottlesList.find(
      (b) => b.type === (bottleChoice === 'standard' ? 'STANDARD' : 'LUXURY')
    );
    return match?.id ?? null;
  }, [bottleChoice, bottlesList]);

  // ── Live price calculations ───────────────────────────────────────────────

  /** Effective oz value — either a preset or the custom input. */
  const effectiveOz = useCustom
    ? (parseFloat(customOz) || 0)
    : selectedOz;

  const bottlePrice    = resolveBottlePrice(bottleChoice);
  const returnDiscount = bottleChoice !== 'own' ? RETURN_DISCOUNT_COP : 0;

  const essencePrice = essence
    ? calculateEssencePrice(essence.pricePerMl, effectiveOz)
    : 0;

  const lineTotal = calculateLineTotal(
    essencePrice,
    bottlePrice,
    returnDiscount,
    // Return discount only applies when a paid bottle is selected AND user opts in.
    bottleChoice !== 'own' && returnsBottle,
  );

  const pointsPreview = calculatePointsPreview(lineTotal);

  const ozOptions = essence ? calculateOzOptions(essence.pricePerMl) : [];

  /** Max oz the customer can order — limited by available stock. */
  const maxOzByStock = essence?.currentStockMl
    ? Math.floor(essence.currentStockMl / OZ_TO_ML)
    : 99;

  const isOutOfStock   = (essence?.currentStockMl ?? 1) === 0;
  const isInvalidOz    = effectiveOz <= 0 || effectiveOz > maxOzByStock;
  const canAddToCart   = !isOutOfStock && effectiveOz > 0 && !isInvalidOz;

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handlePresetOz = (oz: number) => {
    setUseCustom(false);
    setCustomOz('');
    setSelectedOz(oz);
  };

  const handleCustomOz = (value: string) => {
    setCustomOz(value);
    setUseCustom(true);
  };

  const handleBottleChange = (choice: BottleChoice) => {
    setBottleChoice(choice);
    // Reset return toggle when switching to "own bottle" (nothing to return).
    if (choice === 'own') setReturnsBottle(false);
  };

  /**
   * Add the configured item to the Zustand cart.
   * The actual POST /api/orders is made only when the user confirms in CartPage.
   * Item is added to Zustand cartStore. The actual order is created only when
   * user confirms in CartPage.
   */
  const handleAddToCart = () => {
    if (!essence || !canAddToCart) return;

    const ml = Math.round(effectiveOz * OZ_TO_ML * 100) / 100;

    addItem({
      productId:       resolvedBottleId ?? essence.id, // bottle product id if available, else essence id
      name:            essence.name,
      essenceName:     essence.name,
      oz:              effectiveOz,
      ml,
      bottleType:      bottleChoice === 'own' ? 'Propio' : bottleChoice === 'standard' ? 'Estándar' : 'Premium',
      bottlePrice,
      essenceSubtotal: essencePrice,
      returnsBottle:   bottleChoice !== 'own' && returnsBottle,
      returnDiscount:  bottleChoice !== 'own' && returnsBottle ? returnDiscount : 0,
      lineTotal,
      photoUrl:        essence.photoUrl,
    });

    showToast(`¡${essence.name} agregado al carrito!`);
  };

  /**
   * Heart (favorites) is visual only — backend has no favorites endpoint.
   * Show toast: 'Función próximamente'.
   */
  const handleHeart = () => showToast('Función próximamente', 'info');

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: essence?.name, url: window.location.href }).catch(() => null);
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => null);
      showToast('Enlace copiado', 'info');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────

  if (essenceLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Image skeleton */}
        <div className="w-full h-70 bg-border animate-pulse" />
        <div className="px-4 pt-4 space-y-3">
          <div className="h-7 bg-border rounded-lg w-3/4 animate-pulse" />
          <div className="h-4 bg-border rounded-lg w-1/2 animate-pulse" />
          <div className="h-4 bg-border rounded-lg w-2/3 animate-pulse" />
        </div>
      </div>
    );
  }

  if (essenceError || !essence) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-8 text-center">
        <AlertCircle size={40} className="text-warning" strokeWidth={1.5} />
        <p className="font-body text-sm text-muted">
          No pudimos cargar esta esencia. Puede que ya no esté disponible.
        </p>
        <button
          onClick={() => refetchEssence()}
          className="flex items-center gap-1.5 bg-brand-pink text-surface font-body font-medium text-sm px-5 py-2.5 rounded-full"
        >
          <RefreshCw size={14} strokeWidth={2} /> Reintentar
        </button>
        <button
          onClick={() => navigate(-1)}
          className="font-body text-sm text-muted underline"
        >
          Volver al catálogo
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background pb-6 font-body">

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — Image header
          280px hero showing photoUrl or a pink placeholder.
          Back arrow navigates to the previous catalog URL.
          Heart = favorites visual stub (no backend endpoint for favorites yet).
          Share uses Web Share API with clipboard fallback.
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="relative w-full" style={{ height: '280px' }}>
        {essence.photoUrl ? (
          <img
            src={essence.photoUrl}
            alt={essence.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-brand-pink/15 flex items-center justify-center">
            <span className="font-heading font-bold text-8xl text-brand-pink/20 select-none">
              {essence.name[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Gradient scrim for readability of controls */}
        <div className="absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-black/10 pointer-events-none" />

        {/* Back arrow */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-10 left-4 w-9 h-9 rounded-full bg-surface/90 shadow flex items-center justify-center backdrop-blur-sm"
          aria-label="Volver"
        >
          <ArrowLeft size={18} className="text-text-primary" strokeWidth={2} />
        </button>

        {/* Heart + Share — top-right */}
        <div className="absolute top-10 right-4 flex gap-2">
          {/* Heart (favorites) is visual only — backend has no favorites endpoint. */}
          <button
            onClick={handleHeart}
            className="w-9 h-9 rounded-full bg-surface/90 shadow flex items-center justify-center backdrop-blur-sm"
            aria-label="Añadir a favoritos"
          >
            <Heart size={18} className="text-muted" strokeWidth={2} />
          </button>
          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-surface/90 shadow flex items-center justify-center backdrop-blur-sm"
            aria-label="Compartir"
          >
            <Share2 size={18} className="text-muted" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — Product info
            Rating is stored on Essence model but reviews endpoint is not
            yet implemented. Showing static data from the essence object.
        ════════════════════════════════════════════════════════════════════ */}
        <div>
          <h1 className="font-heading font-bold text-[22px] text-text-primary leading-snug">
            {essence.name}
          </h1>

          {/* Rating row — static, reviews endpoint not yet built */}
          <div className="mt-1.5">
            <StarRating rating={essence.rating} reviewCount={essence.reviewCount} />
          </div>

          {/* Inspiration + Family */}
          <p className="font-body text-[13px] text-muted mt-2 leading-snug">
            {essence.inspirationBrand && (
              <>
                <span className="text-text-primary font-medium">Inspirada en: </span>
                {essence.inspirationBrand}
                {essence.olfactiveFamily && ' · '}
              </>
            )}
            {essence.olfactiveFamily && (
              <>
                <span className="text-text-primary font-medium">Familia: </span>
                {essence.olfactiveFamily.name}
              </>
            )}
          </p>

          {/* Stock indicator using currentStockMl from GET /api/essences/:id */}
          <div className="mt-2">
            <StockIndicator
              stockMl={essence.currentStockMl ?? 0}
              minStockMl={essence.minStockGrams ?? 100}
            />
          </div>

          {/* Description */}
          {essence.description && (
            <p className="font-body text-[13px] text-muted mt-3 leading-relaxed">
              {essence.description}
            </p>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3 — Oz selector
            Drives ALL downstream price calculations.
            OZ_TO_ML = 29.5735. Backend CreateOrderUseCase uses
            mlQuantity = oz * OZ_TO_ML when creating the order.
            Custom input allows fractional oz (min: 0.5).
        ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <TestTube size={16} className="text-brand-pink" strokeWidth={2} />
            <h2 className="font-heading font-semibold text-[15px] text-text-primary">
              ¿Cuántas onzas quieres?
            </h2>
          </div>

          {/* 3 preset oz cards */}
          <div className="flex gap-2">
            {ozOptions.map(({ oz, price }) => (
              <button
                key={oz}
                onClick={() => handlePresetOz(oz)}
                disabled={oz > maxOzByStock}
                className={clsx(
                  'flex-1 rounded-xl border-2 py-3 px-2 flex flex-col items-center gap-0.5 transition-colors',
                  !useCustom && selectedOz === oz
                    ? 'border-brand-pink bg-brand-pink/8'
                    : 'border-border bg-surface',
                  oz > maxOzByStock && 'opacity-40 cursor-not-allowed'
                )}
                aria-pressed={!useCustom && selectedOz === oz}
              >
                <span className={clsx(
                  'font-heading font-bold text-[16px] leading-none',
                  !useCustom && selectedOz === oz ? 'text-brand-pink' : 'text-text-primary'
                )}>
                  {oz} OZ
                </span>
                <span className={clsx(
                  'font-body text-[12px] leading-none mt-0.5',
                  !useCustom && selectedOz === oz ? 'text-brand-pink' : 'text-muted'
                )}>
                  {formatCOP(price)}
                </span>
              </button>
            ))}
          </div>

          {/* Custom quantity input */}
          <div className="mt-3 flex items-center gap-2">
            <span className="font-body text-[13px] text-muted flex-none">Otra cantidad:</span>
            <input
              type="number"
              min={0.5}
              max={maxOzByStock}
              step={0.5}
              value={customOz}
              onChange={(e) => handleCustomOz(e.target.value)}
              placeholder="0"
              className={clsx(
                'w-20 border rounded-lg px-2.5 py-1.5 text-sm font-body text-text-primary text-center',
                'outline-none focus:border-brand-pink transition-colors',
                useCustom ? 'border-brand-pink bg-brand-pink/5' : 'border-border bg-surface'
              )}
              aria-label="Cantidad personalizada en onzas"
            />
            <span className="font-body text-[13px] text-muted">oz</span>
          </div>

          {/* ml equivalent — informational */}
          {effectiveOz > 0 && (
            <p className="mt-2 font-body text-[12px] text-brand-blue">
              Equivalente a{' '}
              <strong>{(effectiveOz * OZ_TO_ML).toFixed(2)} ml</strong>
            </p>
          )}

          {/* Stock warning when custom oz exceeds available */}
          {useCustom && parseFloat(customOz) > maxOzByStock && (
            <p className="mt-1.5 font-body text-[12px] text-warning">
              Solo hay {maxOzByStock} oz disponibles en stock.
            </p>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 4 — Bottle type selector
            Bottle prices come from GET /api/bottles. If user selects
            'own bottle', bottleId is null and bottlePrice is 0.
            STANDARD and LUXURY prices are resolved from constants while
            the backend Bottle model lacks a price field.
        ════════════════════════════════════════════════════════════════════ */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical size={16} className="text-brand-pink" strokeWidth={2} />
            <h2 className="font-heading font-semibold text-[15px] text-text-primary">
              Tipo de frasco
            </h2>
          </div>

          <div className="space-y-2">
            {(['own', 'standard', 'luxury'] as BottleChoice[]).map((choice) => {
              const selected = bottleChoice === choice;
              return (
                <button
                  key={choice}
                  onClick={() => handleBottleChange(choice)}
                  className={clsx(
                    'w-full flex items-center gap-3 border-2 rounded-xl px-4 py-3 transition-colors text-left',
                    selected
                      ? 'border-brand-pink bg-brand-pink/8'
                      : 'border-border bg-surface'
                  )}
                  role="radio"
                  aria-checked={selected}
                >
                  {/* Radio indicator */}
                  <span className={clsx(
                    'flex-none w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center',
                    selected ? 'border-brand-pink' : 'border-border'
                  )}>
                    {selected && (
                      <span className="w-2 h-2 rounded-full bg-brand-pink" />
                    )}
                  </span>

                  <span className={clsx(
                    'font-body text-[14px] font-medium flex-1',
                    selected ? 'text-brand-pink' : 'text-text-primary'
                  )}>
                    {resolveBottleLabel(choice)}
                  </span>

                  {/* Own-bottle badge: customer earns return discount regardless */}
                  {choice === 'own' && (
                    <span className="flex-none font-body text-[11px] font-semibold text-success bg-success/10 border border-success/30 px-2 py-0.5 rounded-full">
                      -{formatCOP(RETURN_DISCOUNT_COP)} 🌱
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 5 — Return bottle checkbox
            Only visible when bottleChoice is NOT 'own' (no bottle to return).
            Backend field: isBottleReturn: boolean in CreateOrderInput.
            If true AND frasco is returned in good state, admin applies
            discount via POST /api/returns.
        ════════════════════════════════════════════════════════════════════ */}
        {bottleChoice !== 'own' && (
          <div className="bg-surface rounded-2xl border border-border p-4">
            <button
              onClick={() => setReturnsBottle((v) => !v)}
              className="flex items-start gap-3 w-full text-left"
              aria-pressed={returnsBottle}
            >
              {/* Custom checkbox */}
              <span className={clsx(
                'flex-none mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                returnsBottle ? 'bg-brand-pink border-brand-pink' : 'bg-surface border-border'
              )}>
                {returnsBottle && (
                  <svg viewBox="0 0 12 9" className="w-3 h-3" fill="none">
                    <path d="M1 4l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="font-body text-[14px] text-text-primary leading-snug">
                Devuelvo el frasco en buen estado
              </span>
            </button>

            {returnsBottle && (
              <p className="mt-2 ml-8 font-body text-[13px] font-semibold text-success">
                AHORRAS: {formatCOP(RETURN_DISCOUNT_COP)} ✓
              </p>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 6 — Points preview (gamification hook)
            Only shown when user is authenticated.
            LoyaltyService.calculatePointsForOrder() = Math.floor(total * 1).
            Showing this before checkout increases conversion by making the
            loyalty reward tangible at decision time.
        ════════════════════════════════════════════════════════════════════ */}
        {isAuthenticated && effectiveOz > 0 && (
          <div
            className="flex items-center gap-3 rounded-2xl border border-brand-gold/30 px-4 py-3"
            style={{ backgroundColor: '#FFF8E1' }}
          >
            <Trophy size={18} className="text-brand-gold flex-none" strokeWidth={1.8} />
            <p className="font-heading font-medium text-[13px] text-brand-gold leading-snug">
              Ganarás{' '}
              <strong>{pointsPreview.toLocaleString('es-CO')} puntos</strong>{' '}
              con esta compra
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 7 — Total display
            Real-time breakdown updated on every state change.
            Gold card with price breakdown and discount detail.
        ════════════════════════════════════════════════════════════════════ */}
        {effectiveOz > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: '#F9A825' }}
          >
            <p
              className="font-body text-[11px] font-semibold tracking-widest mb-1"
              style={{ color: 'rgba(0,0,0,0.5)' }}
            >
              PAGO TOTAL
            </p>
            <p
              className="font-heading font-bold text-[26px] leading-none"
              style={{ color: '#212121' }}
            >
              {formatCOP(lineTotal)}
            </p>

            {/* Breakdown */}
            <div className="mt-3 space-y-0.5">
              <div className="flex justify-between text-[12px]" style={{ color: 'rgba(0,0,0,0.65)' }}>
                <span>Esencia {effectiveOz} oz</span>
                <span>{formatCOP(essencePrice)}</span>
              </div>
              <div className="flex justify-between text-[12px]" style={{ color: 'rgba(0,0,0,0.65)' }}>
                <span>Frasco ({bottleChoice === 'own' ? 'propio' : bottleChoice === 'standard' ? 'estándar' : 'premium'})</span>
                <span>{formatCOP(bottlePrice)}</span>
              </div>
              {(bottleChoice !== 'own' && returnsBottle) && (
                <div className="flex justify-between text-[12px] font-semibold" style={{ color: '#1B5E20' }}>
                  <span>Descuento devolución</span>
                  <span>-{formatCOP(returnDiscount)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 8 — Add to cart button
            Disabled when oz = 0, invalid oz, or out of stock.
            On press: writes to Zustand cartStore (cartStore.addItem).
            The actual POST /api/orders is made only when user confirms in CartPage.
            Cart badge in AppBar is updated automatically via cartStore subscription.
        ════════════════════════════════════════════════════════════════════ */}
        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-body font-semibold text-base transition-colors',
            canAddToCart
              ? 'bg-brand-pink text-surface active:bg-brand-pink-dark'
              : 'bg-border text-muted cursor-not-allowed'
          )}
          aria-disabled={!canAddToCart}
        >
          <ShoppingCart size={20} strokeWidth={2} />
          {isOutOfStock
            ? 'Agotado'
            : effectiveOz === 0
            ? 'Selecciona una cantidad'
            : 'Agregar al Carrito'}
        </button>

        {/* Out-of-stock message */}
        {isOutOfStock && (
          <p className="text-center font-body text-[13px] text-warning">
            Esta esencia no tiene stock disponible actualmente.
          </p>
        )}
      </div>

      {/* ── Toast notification ──────────────────────────────────────────────── */}
      {toast.visible && (
        <div
          className={clsx(
            'fixed bottom-24 left-4 right-4 z-50 rounded-xl px-4 py-3 shadow-lg',
            'flex items-center justify-between gap-3 transition-all duration-300',
            toast.type === 'success'
              ? 'bg-surface border border-success/30'
              : 'bg-surface border border-border'
          )}
          role="status"
          aria-live="polite"
        >
          <span className="font-body text-sm text-text-primary font-medium flex-1">
            {toast.message}
          </span>
          {toast.type === 'success' && (
            <button
              onClick={() => navigate('/carrito')}
              className="font-body text-[13px] font-semibold text-brand-pink flex-none"
            >
              Ver carrito
            </button>
          )}
        </div>
      )}

      <BottomTabBar />
    </div>
  );
}
