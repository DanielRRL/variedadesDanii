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
  ArrowLeft, Share2, Leaf, AlertCircle, RefreshCw,
  Check, Minus, Plus, Info, ChevronDown, ChevronUp, ShoppingBag,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { getProductById, getMyGramAccount } from '../services/api';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
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
  const [gramInfoExpanded, setGramInfoExpanded] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
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

  // ── Data — Gram balance (only if logged in) ─────────────────────────────
  const { data: gramRes } = useQuery({
    queryKey: ['gram-account'],
    queryFn: getMyGramAccount,
    staleTime: 2 * 60 * 1000,
    enabled: isAuthenticated,
  });

  const gramBalance: number = gramRes?.data?.account?.currentGrams ?? gramRes?.data?.currentGrams ?? 0;

  // ── Derived ─────────────────────────────────────────────────────────────
  const outOfStock = product ? product.stockUnits <= 0 : true;
  const lowStock = product ? product.stockUnits > 0 && product.stockUnits <= 5 : false;
  const maxAllowed = product ? Math.min(product.stockUnits, MAX_QTY) : 1;
  const lineTotal = product ? product.price * quantity : 0;

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

    const gramMsg = product.generatesGram ? ` (+${quantity}g acumulable)` : '';
    addToast(`${product.name} agregado al carrito${gramMsg}`, 'success');
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
        <button
          onClick={handleShare}
          className={clsx('pd-topbar__btn', justShared && 'pd-topbar__btn--shared')}
          aria-label={justShared ? 'Enlace copiado' : 'Compartir'}
          disabled={justShared}
        >
          {justShared ? (
            <Check size={18} className="pd-topbar__icon--shared" strokeWidth={2.5} />
          ) : (
            <Share2 size={18} className="pd-topbar__icon" strokeWidth={2} />
          )}
        </button>
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

            {/* "Gana 1g" pill — top right */}
            {product.generatesGram && (
              <span className="pd-hero__gram-pill">
                <Leaf size={12} strokeWidth={2.5} />
                Gana 1g
              </span>
            )}
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

              {/* Ml quantity */}
              {product.mlQuantity && (
                <p className="pd-info__ml">
                  Contenido: {product.mlQuantity} ml
                </p>
              )}
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

                {/* Gram earning note */}
                {product.generatesGram && (
                  <p className="pd-quantity__gram-note">
                    <Leaf size={14} />
                    Esta compra te dará {quantity} gramo{quantity !== 1 ? 's' : ''} acumulable{quantity !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {/* ── SECTION 6 — Gram explainer card ────────────────────────── */}
            {product.generatesGram && (
              <button
                onClick={() => setGramInfoExpanded((v) => !v)}
                className="pd-gram"
              >
                <div className="pd-gram__header">
                  <div className="pd-gram__header-left">
                    <Info size={16} className="pd-gram__icon" strokeWidth={2} />
                    <span className="pd-gram__title">
                      ¿Qué son los gramos?
                    </span>
                  </div>
                  {gramInfoExpanded
                    ? <ChevronUp size={16} className="pd-gram__chevron" />
                    : <ChevronDown size={16} className="pd-gram__chevron" />}
                </div>

                <div
                  className={clsx(
                    'pd-gram__body',
                    gramInfoExpanded ? 'pd-gram__body--expanded' : 'pd-gram__body--collapsed'
                  )}
                >
                  <p className="pd-gram__text">
                    Por cada loción comprada acumulas 1 gramo. Al juntar 13 gramos (1 onza)
                    puedes canjear una esencia de perfume gratis. Es nuestro regalo por tu fidelidad.
                  </p>

                  {/* Progress bar */}
                  <div className="pd-gram__progress">
                    <div className="pd-gram__progress-labels">
                      <span className="pd-gram__progress-label">
                        {isAuthenticated ? `${gramBalance}g de 13g` : 'Progreso'}
                      </span>
                      <span className="pd-gram__progress-remaining">
                        {isAuthenticated
                          ? `Te faltan ${Math.max(0, 13 - gramBalance)}g`
                          : 'Crea tu cuenta para acumular'}
                      </span>
                    </div>
                    <div className="pd-gram__progress-bar">
                      <div
                        className="pd-gram__progress-fill"
                        style={{ width: isAuthenticated ? `${Math.min(100, (gramBalance / 13) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </button>
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
