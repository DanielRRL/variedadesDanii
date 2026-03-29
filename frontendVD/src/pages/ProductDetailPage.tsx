/**
 * ProductDetailPage — Full detail view for a single product.
 * Route: /productos/:id (public — no auth required to view)
 *
 * Sections:
 *  1. Custom top bar — back arrow + share icon
 *  2. Product hero — image 280px, type badge, "Gana 1g" pill
 *  3. Product info — name, price, stock, collapsible description
 *  4. Quantity selector — [−] [N] [+] stepper
 *  5. Gram explainer card — expandable (only if generatesGram)
 *  6. Sticky add-to-cart button
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Share2, Leaf, AlertCircle, RefreshCw,
  Check, Minus, Plus, Info, ChevronDown, ChevronUp,
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
  const [descExpanded, setDescExpanded] = useState(false);
  const [gramInfoExpanded, setGramInfoExpanded] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      addToast('Enlace copiado al portapapeles', 'success');
    }
  }, [product, addToast]);

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

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-28 font-body">

      {/* ── SECTION 1 — Custom top bar ──────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-[env(safe-area-inset-top)] h-14 bg-background/80 backdrop-blur-sm">
        <button
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface/90 border border-border shadow-sm"
          aria-label="Volver"
        >
          <ArrowLeft size={20} className="text-text-primary" strokeWidth={2} />
        </button>
        <button
          onClick={handleShare}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface/90 border border-border shadow-sm"
          aria-label="Compartir"
        >
          <Share2 size={18} className="text-text-primary" strokeWidth={2} />
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="animate-pulse">
          <div className="w-full h-[280px] bg-border" />
          <div className="px-4 pt-4 space-y-3">
            <div className="h-5 bg-border rounded-full w-24" />
            <div className="h-7 bg-border rounded-md w-3/4" />
            <div className="h-8 bg-border rounded-md w-1/3" />
            <div className="h-4 bg-border rounded-md w-1/2" />
            <div className="h-20 bg-border rounded-xl w-full" />
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center gap-3 py-24 text-center px-4">
          <AlertCircle size={36} className="text-orange-400" strokeWidth={1.5} />
          <p className="font-body text-sm text-muted">No pudimos cargar este producto.</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 bg-brand-pink text-surface font-body font-medium text-sm px-5 py-2.5 rounded-full"
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
          <div className="relative w-full h-[280px] bg-gradient-to-br from-brand-pink/10 to-brand-pink/5">
            {product.photoUrl ? (
              <img
                src={product.photoUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-heading font-bold text-[72px] text-brand-pink/20 select-none">
                  {product.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Type badge — bottom left */}
            <span className="absolute bottom-3 left-3 bg-surface/90 backdrop-blur-sm text-[11px] font-body font-semibold text-text-primary px-3 py-1 rounded-full border border-border">
              {PRODUCT_TYPE_LABELS[product.productType] ?? product.productType}
            </span>

            {/* "Gana 1g" pill — top right */}
            {product.generatesGram && (
              <span className="absolute top-16 right-3 bg-emerald-500 text-white text-[11px] font-body font-semibold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Leaf size={12} strokeWidth={2.5} />
                Gana 1g
              </span>
            )}
          </div>

          {/* ── SECTION 3 — Product info ────────────────────────────────── */}
          <div className="px-4 pt-5 space-y-3">
            <h1 className="font-heading font-bold text-[22px] text-text-primary leading-tight">
              {product.name}
            </h1>

            <p className="font-heading font-bold text-[28px] text-brand-gold">
              {formatCOP(product.price)}
            </p>

            {/* Stock indicator */}
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  'w-2.5 h-2.5 rounded-full flex-none',
                  outOfStock ? 'bg-red-400' : lowStock ? 'bg-orange-400' : 'bg-emerald-400'
                )}
              />
              <span className="font-body text-sm text-muted">
                {outOfStock
                  ? 'Agotado'
                  : lowStock
                    ? `Quedan ${product.stockUnits} unidades`
                    : `${product.stockUnits} disponibles`}
              </span>
            </div>

            {/* Ml quantity */}
            {product.mlQuantity && (
              <p className="font-body text-[13px] text-muted">
                Contenido: {product.mlQuantity} ml
              </p>
            )}

            {/* Description — collapsible after 3 lines */}
            {product.description && (
              <div>
                <p
                  className={clsx(
                    'font-body text-sm text-muted leading-relaxed',
                    !descExpanded && 'line-clamp-3'
                  )}
                >
                  {product.description}
                </p>
                {product.description.length > 150 && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="font-body text-[13px] text-brand-pink font-medium mt-1"
                  >
                    {descExpanded ? 'Ver menos' : 'Ver más'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── SECTION 4 — Quantity selector ───────────────────────────── */}
          {!outOfStock && (
            <div className="px-4 pt-5">
              <p className="font-body text-[13px] text-muted mb-2">Cantidad</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className={clsx(
                    'w-10 h-10 rounded-full border flex items-center justify-center transition-colors',
                    quantity <= 1
                      ? 'border-border text-border cursor-not-allowed'
                      : 'border-brand-pink text-brand-pink active:bg-brand-pink/10'
                  )}
                  aria-label="Reducir cantidad"
                >
                  <Minus size={18} strokeWidth={2} />
                </button>

                <span className="font-heading font-bold text-lg text-text-primary w-8 text-center">
                  {quantity}
                </span>

                <button
                  onClick={() => setQuantity((q) => Math.min(maxAllowed, q + 1))}
                  disabled={quantity >= maxAllowed}
                  className={clsx(
                    'w-10 h-10 rounded-full border flex items-center justify-center transition-colors',
                    quantity >= maxAllowed
                      ? 'border-border text-border cursor-not-allowed'
                      : 'border-brand-pink text-brand-pink active:bg-brand-pink/10'
                  )}
                  aria-label="Aumentar cantidad"
                >
                  <Plus size={18} strokeWidth={2} />
                </button>
              </div>

              {/* Gram earning note */}
              {product.generatesGram && (
                <p className="font-body text-[13px] text-emerald-600 mt-3 flex items-center gap-1.5">
                  <Leaf size={14} className="flex-none" />
                  Esta compra te dará {quantity} gramo{quantity !== 1 ? 's' : ''} acumulable{quantity !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* ── SECTION 5 — Gram explainer card ─────────────────────────── */}
          {product.generatesGram && (
            <div className="px-4 pt-4">
              <button
                onClick={() => setGramInfoExpanded((v) => !v)}
                className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info size={16} className="text-amber-600 flex-none" />
                    <span className="font-heading font-semibold text-sm text-text-primary">
                      ¿Qué son los gramos?
                    </span>
                  </div>
                  {gramInfoExpanded
                    ? <ChevronUp size={16} className="text-muted" />
                    : <ChevronDown size={16} className="text-muted" />}
                </div>

                <div
                  className={clsx(
                    'overflow-hidden transition-all duration-300',
                    gramInfoExpanded ? 'max-h-60 mt-3' : 'max-h-0'
                  )}
                >
                  <p className="font-body text-[13px] text-muted leading-relaxed">
                    Por cada loción comprada acumulas 1 gramo. Al juntar 13 gramos (1 onza)
                    puedes canjear una esencia de perfume gratis. Es nuestro regalo por tu fidelidad.
                  </p>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-body text-[11px] text-muted">
                        {isAuthenticated ? `${gramBalance}g de 13g` : 'Progreso'}
                      </span>
                      <span className="font-body text-[11px] font-semibold text-amber-600">
                        {isAuthenticated
                          ? `Te faltan ${Math.max(0, 13 - gramBalance)}g`
                          : 'Crea tu cuenta para acumular'}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-amber-200/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: isAuthenticated ? `${Math.min(100, (gramBalance / 13) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </>
      )}

      {/* ── SECTION 6 — Sticky add-to-cart bar ──────────────────────────── */}
      {!isLoading && !isError && product && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border px-4 pb-[env(safe-area-inset-bottom)] pt-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
          <button
            onClick={handleAdd}
            disabled={outOfStock}
            className={clsx(
              'w-full py-3.5 rounded-full text-[15px] font-heading font-bold transition-all flex items-center justify-center gap-2',
              outOfStock
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : justAdded
                  ? 'bg-emerald-500 text-white'
                  : 'bg-brand-pink text-white active:bg-brand-pink/80'
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setShowAuthSheet(false)}
        >
          <div
            className="w-full max-w-lg bg-surface rounded-t-2xl p-6 pb-[env(safe-area-inset-bottom)] space-y-4 animate-[slideUp_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto" />
            <p className="font-heading font-semibold text-base text-text-primary text-center">
              Para comprar, inicia sesión o regístrate
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded-full bg-brand-pink text-white font-body font-semibold text-sm"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => navigate('/register')}
              className="w-full py-3 rounded-full border border-brand-pink text-brand-pink font-body font-semibold text-sm"
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
