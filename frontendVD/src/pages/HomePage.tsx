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
  ShoppingBag, Star, Recycle, CreditCard,
  Package, Trophy, Sparkles, ChevronRight,
  AlertCircle, RefreshCw, User, Crown,
} from 'lucide-react';
import { clsx } from 'clsx';
import { getEssences } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { LoyaltyBadge } from '../components/loyalty/LoyaltyBadge';
import { BottomTabBar } from '../components/layout/BottomTabBar';
import { formatCOP } from '../utils/format';
import type { Essence } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WhatsApp business phone for Variedades DANII (300 383 7442).
 * Used in the hero Contact button.
 */
const WA_NUMBER = '573003837442';
const WA_GREETING = encodeURIComponent('Hola, quiero información sobre las esencias');

/** Points thresholds that match the backend LoyaltyService. */
const PREFERRED_THRESHOLD = 5_000;
const VIP_THRESHOLD        = 15_000;

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
  const level      = user?.loyaltyAccount?.level;
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

        {/* User avatar + loyalty indicator */}
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
              {level === 'VIP' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-gold flex items-center justify-center">
                  <Crown size={9} className="text-surface" strokeWidth={2.5} />
                </span>
              )}
              {level === 'PREFERRED' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-gold flex items-center justify-center">
                  <Star size={9} className="text-surface" strokeWidth={2.5} />
                </span>
              )}
            </div>
            {/* Loyalty badge next to avatar — only for elevated tiers */}
            {level && level !== 'BASIC' && (
              <LoyaltyBadge level={level} size="sm" />
            )}
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
 * Square essence card for the horizontal featured scroll.
 * Distinct from the full EssenceCard — this is a smaller 160×200 variant.
 */
function FeaturedEssenceCard({ essence, onPress }: { essence: Essence; onPress: () => void }) {
  const isOutOfStock = essence.currentStockMl === 0;
  const pricePerOz   = essence.pricePerMl * 29.5735;

  return (
    <article
      onClick={isOutOfStock ? undefined : onPress}
      className={clsx(
        'flex-none w-40 bg-surface rounded-[12px] shadow-card border border-border',
        'flex flex-col overflow-hidden',
        isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:opacity-80'
      )}
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      onKeyDown={(e) => { if (!isOutOfStock && (e.key === 'Enter' || e.key === ' ')) onPress(); }}
      aria-disabled={isOutOfStock}
    >
      {/* Image area (160×110) */}
      <div className="relative w-full h-28 bg-brand-pink/10 overflow-hidden">
        {essence.photoUrl ? (
          <img
            src={essence.photoUrl}
            alt={essence.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-heading font-bold text-4xl text-brand-pink/30 select-none">
              {essence.name[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Family chip top-left */}
        <span className="absolute top-1.5 left-1.5 bg-surface/90 text-text-primary text-[9px] font-body px-1.5 py-0.5 rounded-full leading-none truncate max-w-[80%]">
          {essence.olfactiveFamily.name}
        </span>

        {/* Out of stock overlay */}
        {isOutOfStock && (
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
          {essence.name}
        </p>
        {essence.inspirationBrand && (
          <p className="text-[11px] text-muted font-body leading-snug truncate">
            {essence.inspirationBrand}
          </p>
        )}
        <p className="font-heading font-semibold text-brand-gold text-[12px] leading-none mt-auto">
          {formatCOP(pricePerOz)}/oz
        </p>
      </div>
    </article>
  );
}

/** Skeleton placeholder while essences load — 2 animated pulse cards. */
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
  const loyalty         = user?.loyaltyAccount;

  // ── Section 2 data — GET /api/essences?orderBy=sales&limit=6 ─────────────
  // Backend must support orderBy=sales to return top-selling essences.
  const {
    data: essencesData,
    isLoading: essencesLoading,
    isError: essencesError,
    refetch: retryEssences,
  } = useQuery({
    queryKey: ['essences', 'featured'],
    queryFn:  () => getEssences({ orderBy: 'name', limit: 6 }),
    // Keep stale data visible while revalidating in the background.
    staleTime: 2 * 60 * 1000,
  });

  const essences: Essence[] = Array.isArray(essencesData?.data) ? essencesData.data : (essencesData?.data?.essences ?? []);

  // ── Loyalty progress calculation ──────────────────────────────────────────
  const currentPoints  = loyalty?.points ?? 0;
  const currentLevel   = loyalty?.level  ?? 'BASIC';
  const nextThreshold  = currentLevel === 'BASIC' ? PREFERRED_THRESHOLD : VIP_THRESHOLD;
  const progressPct    = currentLevel === 'VIP'
    ? 100
    : Math.min(100, Math.round((currentPoints / nextThreshold) * 100));
  const nextLevelLabel = currentLevel === 'BASIC' ? 'Preferencial' : 'VIP';

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
              Esencias artesanales por onzas
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
          SECTION 2 — Esencias Destacadas
          GET /api/essences?orderBy=sales&limit=6
          Backend must support orderBy=sales param; falls back to orderBy=name.
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
              Esencias Destacadas
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
          {essencesLoading && <FeaturedSkeleton />}

          {essencesError && (
            <div className="flex flex-col items-center gap-3 py-6 w-full text-center">
              <AlertCircle size={32} className="text-warning" strokeWidth={1.5} />
              <p className="text-muted text-sm font-body">
                No pudimos cargar las esencias. Intenta de nuevo.
              </p>
              <button
                onClick={() => retryEssences()}
                className="flex items-center gap-1.5 bg-brand-pink text-surface font-body font-medium text-sm px-5 py-2 rounded-full"
              >
                <RefreshCw size={14} strokeWidth={2} />
                Reintentar
              </button>
            </div>
          )}

          {!essencesLoading && !essencesError && essences.map((essence) => (
            <FeaturedEssenceCard
              key={essence.id}
              essence={essence}
              onPress={() => navigate(`/esencia/${essence.id}`)}
            />
          ))}

          {!essencesLoading && !essencesError && essences.length === 0 && (
            <p className="text-muted text-sm font-body py-4">
              No hay esencias disponibles por el momento.
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
              Icon: Recycle,
              title: 'Devuelve el frasco, obtén descuento',
              desc:  'Retorna tu frasco vacío y acumula puntos adicionales.',
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
              title: 'Programa de puntos y nivel VIP',
              desc:  'Cada compra te acerca a descuentos exclusivos.',
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
          SECTION 4 — Loyalty teaser
          If NOT authenticated: show registration CTA with level icons.
          If authenticated: show points balance + progress to next level
            (data from authStore.user.loyaltyAccount — no extra API call needed).
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="mt-8 px-4 mb-4" aria-labelledby="loyalty-heading">
        {!isAuthenticated ? (
          /* ── Unauthenticated: invite to register ── */
          <div className="bg-surface rounded-2xl shadow-card border border-border p-5 flex flex-col items-center text-center gap-4">
            <Sparkles size={28} className="text-brand-gold" strokeWidth={1.5} />
            <div>
              <h2
                id="loyalty-heading"
                className="font-heading font-semibold text-[18px] text-text-primary"
              >
                Acumula puntos en cada compra
              </h2>
              <p className="font-body text-[13px] text-muted mt-1 max-w-xs">
                Sube de nivel y desbloquea descuentos exclusivos con cada fragancia.
              </p>
            </div>

            {/* Level progression preview */}
            <div className="flex items-center justify-center gap-2 w-full">
              <LoyaltyBadge level="BASIC"     size="sm" />
              <ChevronRight size={14} className="text-border flex-none" />
              <LoyaltyBadge level="PREFERRED" size="sm" />
              <ChevronRight size={14} className="text-border flex-none" />
              <LoyaltyBadge level="VIP"       size="sm" />
            </div>

            <Link
              to="/register"
              className="bg-brand-pink text-surface font-body font-medium text-sm px-8 py-2.5 rounded-full w-full text-center active:bg-brand-pink-dark transition-colors"
            >
              Regístrate gratis
            </Link>
          </div>
        ) : (
          /* ── Authenticated: loyalty summary card ── */
          <div className="bg-surface rounded-2xl shadow-card border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2
                  id="loyalty-heading"
                  className="font-heading font-semibold text-[16px] text-text-primary"
                >
                  Mis puntos
                </h2>
                <p className="font-body text-[12px] text-muted">
                  {user?.name?.split(' ')[0]}
                </p>
              </div>
              {loyalty && <LoyaltyBadge level={currentLevel} size="sm" />}
            </div>

            {/* Points balance */}
            <p className="font-heading font-bold text-[32px] text-brand-gold leading-none mb-1">
              {currentPoints.toLocaleString('es-CO')}
            </p>
            <p className="font-body text-[12px] text-muted mb-4">
              puntos acumulados
            </p>

            {/* Progress bar to next level */}
            {currentLevel !== 'VIP' && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-body text-[11px] text-muted">
                    Hacia nivel {nextLevelLabel}
                  </span>
                  <span className="font-body text-[11px] text-brand-gold font-medium">
                    {progressPct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-gold rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="font-body text-[11px] text-muted mt-1">
                  Te faltan {Math.max(0, nextThreshold - currentPoints).toLocaleString('es-CO')} puntos
                </p>
              </div>
            )}

            {currentLevel === 'VIP' && (
              <p className="font-body text-[13px] text-brand-gold font-medium flex items-center gap-1">
                <Trophy size={14} strokeWidth={2} />
                ¡Eres cliente VIP! Disfruta tus beneficios exclusivos.
              </p>
            )}

            <Link
              to="/perfil"
              className="mt-4 flex items-center justify-center gap-1 text-brand-blue font-body text-[13px] font-medium"
            >
              Ver mi historial de puntos <ChevronRight size={14} strokeWidth={2} />
            </Link>
          </div>
        )}
      </section>

      {/* ── Bottom tab bar ─────────────────────────────────────────────────── */}
      <BottomTabBar />
    </div>
  );
}
