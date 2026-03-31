/**
 * HomePage — Landing page for Variedades DANII.
 *
 * Sections:
 *  1. Hero banner          — Brand presentation + CTA buttons
 *  2. Esencias Destacadas  — GET /api/essences?orderBy=sales&limit=6
 *  3. Por qué elegirnos    — Static marketing features
 *  4. Loyalty teaser       — Conditional on auth state (no API call if unauthenticated)
 *
 * BottomTabBar fixed at bottom.
 */

import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag, Star, Gamepad2, CreditCard,
  Package, Trophy, Sparkles, ChevronRight,
  AlertCircle, RefreshCw, User, Scale,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getProducts, getMyGramAccount } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import { formatCOP } from '../utils/format';
import { GRAMS_PER_OZ, gramProgress } from '../utils/priceCalculator';
import type { Product, GramAccount } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WhatsApp business phone for Variedades DANII (300 383 7442).
 * Used in the hero Contact button.
 */
const WA_NUMBER = '573003837442';
const WA_GREETING = encodeURIComponent('Hola, quiero información sobre las esencias');

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mini cart/user area shown in the hero banner.
 * Mirrors AppBar but placed inside the pink hero so it uses white icons.
 */
function HeroTopBar() {
  const navigate   = useNavigate();
  const user       = useAuthStore((s) => s.user);
  const cartItems  = useCartStore((s) => s.items);
  const cartCount  = cartItems.length;
  const initials   = user?.name
    ? user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : null;

  return (
    <div className="flex items-center justify-between px-4 pt-10 pb-2">
      {/* Brand name */}
      <span className="font-heading font-bold text-surface text-xl leading-none tracking-tight">
        Variedades DANII
      </span>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Cart */}
        <button
          onClick={() => navigate('/carrito')}
          className="relative w-9 h-9 flex items-center justify-center"
          aria-label={`Carrito, ${cartCount} productos`}
        >
          <ShoppingBag size={22} className="text-surface" strokeWidth={1.8} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-surface text-brand-pink text-[10px] font-body font-medium flex items-center justify-center leading-none">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </button>

        {/* User avatar */}
        {user ? (
          <button
            onClick={() => navigate('/perfil')}
            className="flex items-center gap-1.5"
            aria-label="Perfil"
          >
            <div className="relative w-8 h-8 rounded-full bg-surface/20 border border-surface/40 flex items-center justify-center">
              <span className="font-heading font-bold text-[11px] text-surface leading-none">
                {initials}
              </span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-8 h-8 flex items-center justify-center"
            aria-label="Iniciar sesión"
          >
            <User size={20} className="text-surface" strokeWidth={1.8} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Small product card for the horizontal featured scroll.
 * Shows name, price, type badge, and "Gana 1g" pill.
 */
function FeaturedProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const outOfStock = product.stockUnits <= 0;

  const TYPE_LABELS: Record<string, string> = {
    LOTION: 'Loción', CREAM: 'Crema', SHAMPOO: 'Shampoo',
    MAKEUP: 'Maquillaje', SPLASH: 'Splash', ACCESSORY: 'Accesorio',
  };

  return (
    <article
      onClick={outOfStock ? undefined : onPress}
      className={clsx(
        'flex-none w-40 bg-surface rounded-[12px] shadow-card border border-border',
        'flex flex-col overflow-hidden',
        outOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:opacity-80'
      )}
      role="button"
      tabIndex={outOfStock ? -1 : 0}
      onKeyDown={(e) => { if (!outOfStock && (e.key === 'Enter' || e.key === ' ')) onPress(); }}
      aria-disabled={outOfStock}
    >
      {/* Image area */}
      <div className="relative w-full h-28 bg-brand-pink/10 overflow-hidden">
        {product.photoUrl ? (
          <img
            src={product.photoUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-heading font-bold text-4xl text-brand-pink/30 select-none">
              {product.name[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Type chip top-left */}
        <span className="absolute top-1.5 left-1.5 bg-surface/90 text-text-primary text-[9px] font-body px-1.5 py-0.5 rounded-full leading-none truncate max-w-[80%]">
          {TYPE_LABELS[product.productType] ?? product.productType}
        </span>

        {/* "Gana 1g" pill top-right */}
        {product.generatesGram && (
          <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[9px] font-body font-semibold px-1.5 py-0.5 rounded-full">
            +1g
          </span>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-text-primary/50 flex items-center justify-center">
            <span className="bg-warning text-surface text-[11px] font-body font-medium px-2 py-1 rounded-full">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <p className="font-heading font-semibold text-[13px] text-text-primary leading-snug line-clamp-2">
          {product.name}
        </p>
        <p className="font-heading font-semibold text-brand-gold text-[12px] leading-none mt-auto">
          {formatCOP(product.price)}
        </p>
      </div>
    </article>
  );
}

/** Skeleton placeholder while products load — 2 animated pulse cards. */
function FeaturedSkeleton() {
  return (
    <>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="flex-none w-40 h-48 rounded-[12px] bg-border animate-pulse"
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate        = useNavigate();
  const user            = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // ── Section 2 data — GET /api/products (featured products) ─────────────────
  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
    refetch: retryProducts,
  } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: getProducts,
    staleTime: 2 * 60 * 1000,
  });

  const products: Product[] = (() => {
    const raw = Array.isArray(productsData?.data) ? productsData.data : (productsData?.data?.products ?? []);
    return raw.filter((p: Product) => p.active).slice(0, 6);
  })();

  // ── Gram account query (only when authenticated) ──────────────────────────
  const { data: gramRes } = useQuery({
    queryKey: ['gramAccount', 'home'],
    queryFn: getMyGramAccount,
    enabled: isAuthenticated,
    staleTime: 2 * 60_000,
  });
  const gram = (gramRes?.data?.account ?? gramRes?.data) as GramAccount | undefined;
  const currentGrams = gram?.currentGrams ?? 0;
  const pct = gramProgress(currentGrams);

  return (
    <div className="min-h-screen bg-background pb-20 font-body">

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — Hero banner
          No API call. Uses cartStore + authStore for the top bar.
          The WhatsApp button uses the business phone: 300 383 7442.
      ════════════════════════════════════════════════════════════════════════ */}
      <section
        className="bg-brand-pink w-full"
        style={{ minHeight: '280px' }}
        aria-label="Hero"
      >
        <HeroTopBar />

        <div className="px-4 pt-6 pb-8 flex flex-col gap-4">
          <div>
            <h1 className="font-heading font-bold text-surface text-[28px] leading-tight max-w-xs">
              Tu fragancia perfecta al precio que mereces
            </h1>
            <p className="font-body font-normal text-[14px] text-surface/80 mt-2">
              Lociones, cremas y más al mejor precio
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            {/* Primary CTA */}
            <button
              onClick={() => navigate('/catalogo')}
              className="bg-surface text-brand-pink font-body font-medium text-sm px-6 py-2.5 rounded-full active:opacity-80 transition-opacity"
            >
              Ver Catálogo
            </button>

            {/* WhatsApp contact button.
                The WhatsApp contact button uses the business phone from the brand card (300 383 7442). */}
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${WA_GREETING}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-surface text-surface font-body font-medium text-sm px-6 py-2.5 rounded-full active:opacity-80 transition-opacity inline-flex items-center gap-1.5"
            >
              Contactar
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — Productos Destacados
          GET /api/products — shows the first 6 active products.
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="mt-6 px-4" aria-labelledby="featured-heading">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Star size={16} className="text-brand-gold fill-brand-gold" strokeWidth={0} />
            <h2
              id="featured-heading"
              className="font-heading font-semibold text-base text-text-primary"
            >
              Productos Destacados
            </h2>
          </div>
          <Link
            to="/catalogo"
            className="font-body text-[13px] text-brand-blue font-medium flex items-center gap-0.5"
          >
            VER TODO <ChevronRight size={14} strokeWidth={2} />
          </Link>
        </div>

        {/* Horizontal scroll container */}
        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {productsLoading && <FeaturedSkeleton />}

          {productsError && (
            <div className="flex flex-col items-center gap-3 py-6 w-full text-center">
              <AlertCircle size={32} className="text-warning" strokeWidth={1.5} />
              <p className="text-muted text-sm font-body">
                No pudimos cargar los productos. Intenta de nuevo.
              </p>
              <button
                onClick={() => retryProducts()}
                className="flex items-center gap-1.5 bg-brand-pink text-surface font-body font-medium text-sm px-5 py-2 rounded-full"
              >
                <RefreshCw size={14} strokeWidth={2} />
                Reintentar
              </button>
            </div>
          )}

          {!productsLoading && !productsError && products.map((product) => (
            <FeaturedProductCard
              key={product.id}
              product={product}
              onPress={() => navigate(`/productos/${product.id}`)}
            />
          ))}

          {!productsLoading && !productsError && products.length === 0 && (
            <p className="text-muted text-sm font-body py-4">
              No hay productos disponibles por el momento.
            </p>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — Por qué elegirnos
          Static marketing section. Updated manually when business model changes.
          No API call.
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="mt-8 px-4" aria-labelledby="why-heading">
        <h2
          id="why-heading"
          className="font-heading font-semibold text-[18px] text-text-primary mb-3"
        >
          ¿Por qué elegirnos?
        </h2>

        <div className="flex flex-col gap-3">
          {[
            {
              Icon: Gamepad2,
              title: 'Juega y gana gramos',
              desc:  'Cada compra te da una ficha de juego. Gira la ruleta y gana gramos extra.',
            },
            {
              Icon: CreditCard,
              title: 'Paga con Nequi, Bancolombia Breve o Bre-B',
              desc:  'Transferencias sin comisión, confirmación inmediata.',
            },
            {
              Icon: Package,
              title: 'Retira en tienda o domicilio a Armenia',
              desc:  'Recoge sin costo o solicita envío directo a tu casa.',
            },
            {
              Icon: Trophy,
              title: 'Acumula 13g y gana 1 oz de esencia',
              desc:  'Cada compra suma gramos. Al llegar a 13 canjeas una onza gratis.',
            },
          ].map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="bg-surface rounded-xl shadow-card border border-border flex items-start gap-3 p-4"
            >
              {/* Pink circle with icon */}
              <div className="flex-none w-10 h-10 rounded-full bg-brand-pink/10 flex items-center justify-center">
                <Icon size={20} className="text-brand-pink" strokeWidth={1.8} />
              </div>
              <div>
                <p className="font-body font-medium text-[14px] text-text-primary leading-snug">
                  {title}
                </p>
                <p className="font-body text-[12px] text-muted leading-snug mt-0.5">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — Gram wallet teaser
          If NOT authenticated: show registration CTA with gram-earning methods.
          If authenticated: show gram balance + progress bar toward next free oz.
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="mt-8 px-4 mb-4" aria-labelledby="gram-heading">
        {!isAuthenticated ? (
          /* ── Unauthenticated: invite to register ── */
          <div className="bg-surface rounded-2xl shadow-card border border-border p-5 flex flex-col items-center text-center gap-4">
            <Sparkles size={28} className="text-brand-gold" strokeWidth={1.5} />
            <div>
              <h2
                id="gram-heading"
                className="font-heading font-semibold text-[18px] text-text-primary"
              >
                Acumula gramos y gana esencias gratis
              </h2>
              <p className="font-body text-[13px] text-muted mt-1 max-w-xs">
                Cada compra te da 1g + una ficha de juego. Al llegar a {GRAMS_PER_OZ}g canjeas 1 oz de esencia.
              </p>
            </div>

            {/* How to earn grams */}
            <div className="flex items-center justify-center gap-4 w-full">
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center">
                  <Scale size={18} className="text-brand-gold" />
                </div>
                <span className="text-[10px] text-muted">Compra</span>
              </div>
              <ChevronRight size={14} className="text-border flex-none" />
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-brand-pink/10 flex items-center justify-center">
                  <Gamepad2 size={18} className="text-brand-pink" />
                </div>
                <span className="text-[10px] text-muted">Juega</span>
              </div>
              <ChevronRight size={14} className="text-border flex-none" />
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center">
                  <Trophy size={18} className="text-brand-gold" />
                </div>
                <span className="text-[10px] text-muted">Canjea</span>
              </div>
            </div>

            <Link
              to="/register"
              className="bg-brand-pink text-surface font-body font-medium text-sm px-8 py-2.5 rounded-full w-full text-center active:bg-brand-pink-dark transition-colors"
            >
              Regístrate gratis
            </Link>
          </div>
        ) : (
          /* ── Authenticated: gram wallet summary ── */
          <div className="bg-surface rounded-2xl shadow-card border border-brand-gold/30 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2
                  id="gram-heading"
                  className="font-heading font-semibold text-[16px] text-text-primary"
                >
                  Mis gramos
                </h2>
                <p className="font-body text-[12px] text-muted">
                  {user?.name?.split(' ')[0]}
                </p>
              </div>
              <Scale size={22} className="text-brand-gold" />
            </div>

            {/* Gram balance */}
            <div className="flex items-end gap-1 mb-1">
              <p className="font-heading font-bold text-[32px] text-brand-gold leading-none">
                {currentGrams}
              </p>
              <p className="font-body text-[14px] text-muted mb-1">
                / {GRAMS_PER_OZ}g
              </p>
            </div>
            <p className="font-body text-[12px] text-muted mb-4">
              {currentGrams >= GRAMS_PER_OZ
                ? '¡Puedes canjear 1 oz de esencia gratis!'
                : `${GRAMS_PER_OZ - currentGrams}g más para tu próxima oz gratis`}
            </p>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-border rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-brand-gold rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            <Link
              to="/mis-gramos"
              className="flex items-center justify-center gap-1 text-brand-blue font-body text-[13px] font-medium"
            >
              Ver mi billetera de gramos <ChevronRight size={14} strokeWidth={2} />
            </Link>
          </div>
        )}
      </section>

      {/* ── Bottom tab bar ─────────────────────────────────────────────────── */}
      <BottomTabBar />
    </div>
  );
}
