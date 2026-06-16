/**
 * EssenceDetailPage — Order configurator for a single perfume essence.
 * Route: /esencia/:id
 *
 * Critical conversion screen. Every interaction updates price totals in real-time.
 *
 * Sections:
 *  1. Image header          — full-width hero with back / heart / share actions
 *  2. Product info          — name, rating, family, inspiration, stock, description
 *  3. Oz selector           — 3 preset cards + custom input. Drives ALL price calcs.
 *  4. Points preview        — gamification hook (auth only).
 *  5. Total display         — real-time breakdown.
 *  6. Add-to-cart button    — writes to cartStore. No API call at this stage.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Heart, Share2, Star,
  TestTube,
  ShoppingCart, AlertCircle, RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getEssenceById } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useFavoriteStore } from '../stores/favoriteStore';
import { StockIndicator } from '../components/catalog/StockIndicator';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import { formatCOP } from '../utils/format';
import {
  OZ_TO_ML,
  getEssencePrice,
  buildOzOptions,
} from '../utils/priceCalculator';
import { getImageSrc } from '../utils/imageUtils';
import type { Essence, Product } from '../types';
import styles from './EssenceDetailPage.module.css';

const GENDER_LABELS: Record<string, string> = {
  MUJER: 'Mujer', HOMBRE: 'Hombre', UNISEX: 'Unisex',
};

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'info' | 'error';
}

function StarRating({ rating = 0, reviewCount = 0 }: { rating?: number; reviewCount?: number }) {
  return (
    <div className={styles.starRating} aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={styles.starWrap}>
          <Star size={14} className={styles.starOutline} strokeWidth={1.5} />
          {rating >= i + 1 && (
            <span className={styles.starFilled}>
              <Star size={14} strokeWidth={1.5} />
            </span>
          )}
          {rating >= i + 0.5 && rating < i + 1 && (
            <span className={styles.starHalf}>
              <Star size={14} strokeWidth={1.5} />
            </span>
          )}
        </span>
      ))}
      {reviewCount > 0 && (
        <span className={styles.starCount}>
          {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? 'reseña' : 'reseñas'})
        </span>
      )}
    </div>
  );
}

export default function EssenceDetailPage() {
  const { id }        = useParams<{ id: string }>();
  const navigate      = useNavigate();
  const addItem       = useCartStore((s) => s.addItem);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const isFavorited = useFavoriteStore((s) => s.isFavorited);
  const toggleFavorite = useFavoriteStore((s) => s.toggle);
  const favorited = id ? isFavorited('essence', id) : false;

  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500);
  };

  const [selectedOz,    setSelectedOz]    = useState<number>(1);
  const [customOz,      setCustomOz]      = useState<string>('');
  const [useCustom,     setUseCustom]     = useState(false);

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

  const effectiveOz = useCustom
    ? (parseFloat(customOz) || 0)
    : selectedOz;

  const essencePrice = essence ? getEssencePrice(effectiveOz, false) : 0;

  const lineTotal = essencePrice;

  const ozOptions = buildOzOptions(false);

  const isOutOfStock   = (essence?.currentStockMl ?? 1) === 0;
  const isInvalidOz    = effectiveOz <= 0;
  const canAddToCart   = !isOutOfStock && effectiveOz > 0 && !isInvalidOz;

  const handlePresetOz = (oz: number) => {
    setUseCustom(false);
    setCustomOz('');
    setSelectedOz(oz);
  };

  const handleCustomOz = (value: string) => {
    setCustomOz(value);
    setUseCustom(true);
  };

  const handleAddToCart = () => {
    if (!essence || !canAddToCart) return;

    addItem({
      id: essence.id,
      name: essence.name,
      productType: 'ESSENCE_CATALOG' as Product['productType'],
      price: essencePrice,
      active: true,
      stockUnits: 999,
      photoUrl: essence.photoUrl,
    } as Product);

    showToast(`¡${essence.name} agregado al carrito!`);
  };

  const handleHeart = async () => {
    if (!isAuthenticated) { showToast('Inicia sesión para guardar favoritos', 'info'); return; }
    try {
      const { favorited: newFav } = await toggleFavorite('essence', id!);
      showToast(newFav ? 'Añadido a favoritos' : 'Quitado de favoritos', 'info');
    } catch { showToast('Error al guardar favorito', 'error'); }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: essence?.name, url: window.location.href }).catch(() => null);
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => null);
      showToast('Enlace copiado', 'info');
    }
  };

  if (essenceLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonHero} />
        <div className={styles.skeletonLoading}>
          <div className={styles.skeletonText} />
          <div className={styles.skeletonTextSm} />
          <div className={styles.skeletonTextSm} />
        </div>
      </div>
    );
  }

  if (essenceError || !essence) {
    return (
      <div className={styles.errorPage}>
        <AlertCircle size={40} className={styles.errorIcon} strokeWidth={1.5} />
        <p className={styles.errorText}>
          No pudimos cargar esta esencia. Puede que ya no esté disponible.
        </p>
        <button onClick={() => refetchEssence()} className={styles.retryButton}>
          <RefreshCw size={14} strokeWidth={2} /> Reintentar
        </button>
        <button onClick={() => navigate(-1)} className={styles.errorBackLink}>
          Volver al catálogo
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* ═══ Section 1 — Image header ═══ */}
      <div className={styles.hero}>
        {essence.photoUrl ? (
          <img
            src={getImageSrc(essence.photoUrl)}
            alt={essence.name}
            className={styles.heroImg}
          />
        ) : (
          <div className={styles.heroPlaceholder}>
            <span className={styles.heroPlaceholderLetter}>
              {essence.name[0]?.toUpperCase()}
            </span>
          </div>
        )}
        <button
          onClick={() => navigate(-1)}
          className={styles.heroBackBtn}
          aria-label="Volver"
        >
          <ArrowLeft size={18} color="var(--color-text-primary)" strokeWidth={2} />
        </button>

        <div className={styles.heroActions}>
          <button
            onClick={handleHeart}
            className={styles.heroActionBtn}
            aria-label={favorited ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          >
            <Heart
              size={18}
              color={favorited ? 'var(--color-brand-pink)' : 'var(--color-muted)'}
              fill={favorited ? 'var(--color-brand-pink)' : 'none'}
              strokeWidth={favorited ? 2.5 : 2}
            />
          </button>
          <button
            onClick={handleShare}
            className={styles.heroActionBtn}
            aria-label="Compartir"
          >
            <Share2 size={18} color="var(--color-muted)" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className={styles.content}>

        {/* ═══ Section 2 — Product info ═══ */}
        <div>
          <h1 className={styles.productName}>{essence.name}</h1>

          <p className={styles.productPrice}>Desde {formatCOP(getEssencePrice(1))}</p>

          <div className={styles.ratingRow}>
            <StarRating rating={essence.rating} reviewCount={essence.reviewCount} />
          </div>

          <div className={styles.productMeta}>
            {essence.inspirationBrand && (
              <span className={styles.metaPill}>
                Inspirada en <span className={styles.metaPillBrand}>{essence.inspirationBrand}</span>
              </span>
            )}
            {essence.olfactiveFamily && (
              <span className={styles.metaPill}>
                {essence.olfactiveFamily.name}
              </span>
            )}
            {essence.gender && (
              <span className={styles.metaPill}>
                {GENDER_LABELS[essence.gender] ?? essence.gender}
              </span>
            )}
          </div>

          <div className={styles.ratingRow}>
            <StockIndicator
              stockMl={essence.currentStockMl ?? 0}
              minStockMl={essence.minStockGrams ?? 100}
            />
          </div>

          {essence.description && (
            <p className={styles.productDesc}>{essence.description}</p>
          )}
        </div>

        {/* ═══ Section 3 — Oz selector ═══ */}
        <div className={styles.configCard}>
          <div className={styles.configHeader}>
            <TestTube size={16} className={styles.configIcon} strokeWidth={2} />
            <h2 className={styles.configTitle}>¿Cuántas onzas quieres?</h2>
          </div>

          <div className={styles.ozGrid}>
            {ozOptions.map(({ oz, price }) => (
              <button
                key={oz}
                onClick={() => handlePresetOz(oz)}
                className={clsx(
                  styles.ozCard,
                  !useCustom && selectedOz === oz && styles.ozCardActive,
                )}
                aria-pressed={!useCustom && selectedOz === oz}
              >
                <span className={styles.ozValue}>{oz} OZ</span>
                <span className={styles.ozPrice}>{formatCOP(price)}</span>
              </button>
            ))}
          </div>

          <div className={styles.customRow}>
            <span className={styles.customLabel}>Otra cantidad:</span>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={customOz}
              onChange={(e) => handleCustomOz(e.target.value)}
              placeholder="0"
              className={clsx(styles.customInput, useCustom && styles.customInputActive)}
              aria-label="Cantidad personalizada en onzas"
            />
            <span className={styles.customUnit}>oz</span>
          </div>

          {effectiveOz > 0 && (
            <p className={styles.ozMlInfo}>
              Equivalente a{' '}
              <strong>{(effectiveOz * OZ_TO_ML).toFixed(2)} ml</strong>
            </p>
          )}
        </div>

        {effectiveOz > 0 && (
          <div className={styles.totalCard}>
            <p className={styles.totalTopLabel}>PAGO TOTAL</p>
            <p className={styles.totalAmount}>{formatCOP(lineTotal)}</p>

            <div className={styles.totalBreakdown}>
              <div className={styles.totalLine}>
                <span className={styles.totalLineLabel}>Esencia {effectiveOz} oz</span>
                <span className={styles.totalLineValue}>{formatCOP(essencePrice)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Section 6 — Add to cart ═══ */}
        <button
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          className={clsx(styles.ctaButton, !canAddToCart && styles.ctaButtonDisabled)}
          aria-disabled={!canAddToCart}
        >
          <ShoppingCart size={20} strokeWidth={2} />
          {isOutOfStock
            ? 'Agotado'
            : effectiveOz === 0
            ? 'Selecciona una cantidad'
            : 'Agregar al Carrito'}
        </button>

        {isOutOfStock && (
          <p className={styles.outOfStockNote}>
            Esta esencia no tiene stock disponible actualmente.
          </p>
        )}
      </div>

      {/* ── Toast notification ──────────────────────────────────────────────── */}
      {toast.visible && (
        <div
          className={clsx(styles.toastBase, toast.type === 'success' ? styles.toastSuccess : styles.toastInfo)}
          role="status"
          aria-live="polite"
        >
          <span className={styles.toastMsg}>{toast.message}</span>
          {toast.type === 'success' && (
            <button onClick={() => navigate('/carrito')} className={styles.toastAction}>
              Ver carrito
            </button>
          )}
        </div>
      )}

      <BottomTabBar />
    </div>
  );
}
