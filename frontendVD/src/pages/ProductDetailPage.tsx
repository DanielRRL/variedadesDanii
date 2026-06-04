/**
 * ProductDetailPage — Full detail view for a single product.
 * Route: /productos/:id (public — no auth required to view)
 *
 * Sections:
 *  1. Custom top bar — back arrow + share icon
 *  2. Product hero — image 320px, type badge top-left, "Gana 1g" pill top-right
 *  3. Product info card — name, price, stock, ml quantity
 *  4. Description card — collapsible (Info icon + "Descripción")
 *  5. Quantity card — [−] [N] [+] stepper + gram earning note (ShoppingBag icon)
 *  6. Gram explainer card — expandable (only if generatesGram)
 *  7. Sticky add-to-cart button
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Share2, AlertCircle, RefreshCw,
  Check, Minus, Plus, Info, ShoppingBag, Heart,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { getProductById } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { useFavoriteStore } from '../stores/favoriteStore';
import { useToastStore } from '../stores/toastStore';
import { formatCOP } from '../utils/format';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import type { Product } from '../types';
import '../css/ProductDetailPage.css';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  LOTION: 'LOCIÓN',
  CREAM: 'CREMA',
  SHAMPOO: 'SHAMPOO',
  MAKEUP: 'MAQUILLAJE',
  SPLASH: 'SPLASH',
  ACCESSORY: 'ACCESORIO',
  ESSENCE_CATALOG: 'ESENCIA',
};

const MAX_QTY = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addToast = useToastStore((s) => s.addToast);

  // ── UI state ────────────────────────────────────────────────────────────
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [justShared, setJustShared] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const isFavorited = useFavoriteStore((s) => s.isFavorited);
  const toggleFavorite = useFavoriteStore((s) => s.toggle);
  const favorited = id ? isFavorited('product', id) : false;
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sharedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Reset quantity when navigating to a different product (state adjustment
  // during render — avoids the cascading-render warning from useEffect).
  const [prevId, setPrevId] = useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setQuantity(1);
  }

  // ── Data — Product ──────────────────────────────────────────────────────
  const { data: res, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id!),
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  const product: Product | null = res?.data ?? null;

  // ── Derived ─────────────────────────────────────────────────────────────
  const outOfStock = product ? product.stockUnits <= 0 : true;
  const lowStock = product ? product.stockUnits > 0 && product.stockUnits <= 5 : false;
  const maxAllowed = product ? Math.min(product.stockUnits, MAX_QTY) : 1;
  const lineTotal = product ? product.price * quantity : 0;

  // ── Favorites ─────────────────────────────────────────────────────────────
  const handleFavorite = async () => {
    if (!isAuthenticated) { setShowAuthSheet(true); return; }
    setFavLoading(true);
    try {
      if (id) await toggleFavorite('product', id);
    } catch { addToast('Error al guardar favorito', 'error'); }
    finally { setFavLoading(false); }
  };

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = product?.name ?? 'Producto';
    setJustShared(true);
    clearTimeout(sharedTimerRef.current);
    sharedTimerRef.current = setTimeout(() => setJustShared(false), 2500);
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [product]);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/catalogo');
    }
  };

  const handleAdd = () => {
    if (!product || outOfStock) return;

    if (!isAuthenticated) {
      setShowAuthSheet(true);
      return;
    }

    addItem(product, quantity);
    setJustAdded(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setJustAdded(false), 1500);

    addToast(`${product.name} agregado al carrito`, 'success');
  };

  useEffect(() => () => { clearTimeout(timerRef.current); clearTimeout(sharedTimerRef.current); }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="pd-page">

      {/* ── SECTION 1 — Custom top bar ──────────────────────────────────── */}
      <div className="pd-topbar">
        <button
          onClick={handleBack}
          className="pd-topbar__btn"
          aria-label="Volver"
        >
          <ArrowLeft size={20} className="pd-topbar__icon" strokeWidth={2} />
        </button>
        <div />
      </div>

      {/* Share confirmation toast */}
      {justShared && (
        <div className="pd-share-toast" role="status" aria-live="polite">
          <Check size={14} strokeWidth={2.5} />
          Enlace copiado al portapapeles
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="pd-skeleton">
          <div className="pd-skeleton__hero" />
          <div className="pd-skeleton__content">
            <div className="pd-skeleton__card">
              <div className="pd-skeleton__line pd-skeleton__line--sm" />
              <div className="pd-skeleton__line pd-skeleton__line--md" />
              <div className="pd-skeleton__line pd-skeleton__line--sm" />
            </div>
            <div className="pd-skeleton__card">
              <div className="pd-skeleton__line pd-skeleton__line--sm" />
              <div className="pd-skeleton__line pd-skeleton__line--lg" />
            </div>
            <div className="pd-skeleton__card">
              <div className="pd-skeleton__line pd-skeleton__line--sm" />
              <div className="pd-skeleton__line pd-skeleton__line--md" />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="pd-error">
          <AlertCircle size={36} className="pd-error__icon" strokeWidth={1.5} />
          <p className="pd-error__text">No pudimos cargar este producto.</p>
          <button
            onClick={() => refetch()}
            className="pd-error__retry"
          >
            <RefreshCw size={14} strokeWidth={2} />
            Reintentar
          </button>
        </div>
      )}

      {/* ── Product loaded ──────────────────────────────────────────────── */}
      {!isLoading && !isError && product && (
        <>
          {/* ── SECTION 2 — Product hero ────────────────────────────────── */}
          <div className="pd-hero">
            {product.photoUrl ? (
              <img
                src={product.photoUrl}
                alt={product.name}
                className="pd-hero__img"
              />
            ) : (
              <div className="pd-hero__placeholder">
                <span className="pd-hero__letter">
                  {product.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Gradient fade to background */}
            <div className="pd-hero__fade" />

            {/* Type badge — top left */}
            <span className="pd-hero__type-badge">
              {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
            </span>

            {/* Favorite & Share — top right */}
            <div className="pd-hero__actions">
              <button
                onClick={handleFavorite}
                disabled={favLoading}
                className={clsx('pd-hero__action-btn', favorited && 'pd-hero__action-btn--favorited')}
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
                className="pd-hero__action-btn"
                aria-label="Compartir"
              >
                <Share2 size={18} color="var(--color-muted)" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* ── SECTION 3 — Product info card ───────────────────────────── */}
          <div className="pd-content">
            <div className="pd-card pd-info">
              <h1 className="pd-info__name">
                {product.name}
              </h1>

              <p className="pd-info__price">
                {formatCOP(product.price)}
              </p>

              {/* Stock indicator */}
              <div className="pd-info__stock">
                <span
                  className={clsx(
                    'pd-info__stock-dot',
                    outOfStock
                      ? 'pd-info__stock-dot--out'
                      : lowStock
                        ? 'pd-info__stock-dot--low'
                        : 'pd-info__stock-dot--ok'
                  )}
                />
                <span className="pd-info__stock-text">
                  {outOfStock
                    ? 'Agotado'
                    : lowStock
                      ? `Quedan ${product.stockUnits} unidades`
                      : `${product.stockUnits} disponibles`}
                </span>
              </div>
            </div>

            {/* ── SECTION 4 — Description card ───────────────────────────── */}
            {product.description && (
              <div className="pd-card">
                <div className="pd-section-header">
                  <Info size={16} className="pd-section-header__icon" strokeWidth={2} />
                  <h2 className="pd-section-header__title">
                    Descripción
                  </h2>
                </div>
                <p
                  className={clsx(
                    'pd-desc__text',
                    !descExpanded && 'pd-desc__text--clamped'
                  )}
                >
                  {product.description}
                </p>
                {product.description.length > 150 && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="pd-desc__toggle"
                  >
                    {descExpanded ? 'Ver menos' : 'Ver más'}
                  </button>
                )}
              </div>
            )}

            {/* ── SECTION 5 — Quantity card ──────────────────────────────── */}
            {!outOfStock && (
              <div className="pd-card">
                <div className="pd-section-header">
                  <ShoppingBag size={16} className="pd-section-header__icon" strokeWidth={2} />
                  <h2 className="pd-section-header__title">
                    Cantidad
                  </h2>
                </div>

                <div className="pd-quantity__stepper">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className={clsx(
                      'pd-quantity__stepper-btn',
                      quantity <= 1 && 'pd-quantity__stepper-btn--disabled'
                    )}
                    aria-label="Reducir cantidad"
                  >
                    <Minus size={18} strokeWidth={2} />
                  </button>

                  <span className="pd-quantity__count">
                    {quantity}
                  </span>

                  <button
                    onClick={() => setQuantity((q) => Math.min(maxAllowed, q + 1))}
                    disabled={quantity >= maxAllowed}
                    className={clsx(
                      'pd-quantity__stepper-btn',
                      quantity >= maxAllowed && 'pd-quantity__stepper-btn--disabled'
                    )}
                    aria-label="Aumentar cantidad"
                  >
                    <Plus size={18} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── SECTION 7 — Sticky add-to-cart bar ──────────────────────────── */}
      {!isLoading && !isError && product && (
        <div className="pd-cart-bar">
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className={clsx(
              'pd-cart-bar__btn',
              outOfStock && 'pd-cart-bar__btn--out',
              !outOfStock && justAdded && 'pd-cart-bar__btn--added'
            )}
          >
            {outOfStock ? (
              'Agotado'
            ) : justAdded ? (
              <>
                <Check size={18} strokeWidth={2.5} />
                Agregado
              </>
            ) : (
              `Agregar al carrito — ${formatCOP(lineTotal)}`
            )}
          </button>
        </div>
      )}

      {/* ── Auth bottom sheet ────────────────────────────────────────────── */}
      {showAuthSheet && (
        <div
          className="pd-auth-sheet__overlay"
          onClick={() => setShowAuthSheet(false)}
        >
          <div
            className="pd-auth-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pd-auth-sheet__handle" />
            <p className="pd-auth-sheet__title">
              Para comprar, inicia sesión o regístrate
            </p>
            <button
              onClick={() => navigate('/login')}
              className="pd-auth-sheet__btn pd-auth-sheet__btn--primary"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => navigate('/register')}
              className="pd-auth-sheet__btn pd-auth-sheet__btn--outline"
            >
              Crear cuenta gratis
            </button>
          </div>
        </div>
      )}

      <BottomTabBar />
    </div>
  );
}
