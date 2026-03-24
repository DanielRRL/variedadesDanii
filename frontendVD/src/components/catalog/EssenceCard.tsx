/**
 * EssenceCard — Horizontal catalog card for a single perfume essence.
 *
 * Layout:
 *   [Image 100×100] | [Name, inspired by, family, stars, stock, price, "Ver más"]
 *
 * Badges overlaid on the image:
 *   - "ORIGINAL" (pink)  → inspirationBrand is a recognised premium brand
 *   - "POPULAR"  (blue)  → rating >= 4.5
 *
 * When the essence is out of stock the card is dimmed (opacity-60) and the
 * "Agregar" button / link is visually disabled.
 *
 * Prices are formatted with formatCOP() — dot-separated thousands, COP prefix.
 */

import { Star } from 'lucide-react';
import { clsx } from 'clsx';
import type { Essence } from '../../types';
import { StockIndicator } from './StockIndicator';
import { formatCOP } from '../../utils/format';

/**
 * Premium brands whose essences earn the "ORIGINAL" badge.
 * Keep this list in sync with the admin catalog configuration.
 */
const PREMIUM_BRANDS = [
  'Chanel', 'Dior', 'Yves Saint Laurent', 'YSL', 'Givenchy', 'Hermès', 'Hermes',
  'Guerlain', 'Lancôme', 'Lancome', 'Prada', 'Versace', 'Armani', 'Giorgio Armani',
  'Tom Ford', 'Dolce & Gabbana', 'Valentino', 'Burberry', 'Balenciaga',
];

function isPremiumBrand(brand: string | undefined): boolean {
  if (!brand) return false;
  return PREMIUM_BRANDS.some((b) => brand.toLowerCase().includes(b.toLowerCase()));
}

// ─────────────────────────────────────────────────────────────────────────────
// StarRating sub-component
// ─────────────────────────────────────────────────────────────────────────────

/** Renders filled, half, and empty stars from a 0–5 rating value. */
function StarRating({ rating = 0, reviewCount = 0 }: { rating?: number; reviewCount?: number }) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = rating >= i + 1;
    const half   = !filled && rating >= i + 0.5;
    return { filled, half };
  });

  return (
    <div className="flex items-center gap-0.5">
      {stars.map(({ filled, half }, i) => (
        <span key={i} className="relative inline-flex">
          {/* Empty star base */}
          <Star size={12} className="text-border" strokeWidth={1.5} />
          {/* Filled overlay */}
          {(filled || half) && (
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: half ? '50%' : '100%' }}
            >
              <Star size={12} className="text-brand-gold fill-brand-gold" strokeWidth={1.5} />
            </span>
          )}
        </span>
      ))}
      {reviewCount > 0 && (
        <span className="text-[11px] text-muted font-body ml-1">
          ({reviewCount} {reviewCount === 1 ? 'reseña' : 'reseñas'})
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EssenceCard
// ─────────────────────────────────────────────────────────────────────────────

export interface EssenceCardProps {
  essence: Essence;
  /** Called when the user taps the card or "Ver más". Navigates to /esencia/:id. */
  onPress: () => void;
}

/**
 * Horizontal card presenting an essence in the catalog list.
 * Designed for a 375px base width (full bleed card on mobile).
 */
export function EssenceCard({ essence, onPress }: EssenceCardProps) {
  const isOutOfStock = essence.currentStockMl === 0;

  /** Price for 1 oz (the smallest configurable quantity). */
  const pricePerOz = essence.pricePerMl * 29.5735;

  const showOriginalBadge = isPremiumBrand(essence.inspirationBrand);
  const showPopularBadge  = !showOriginalBadge && (essence.rating ?? 0) >= 4.5;

  return (
    <article
      onClick={isOutOfStock ? undefined : onPress}
      className={clsx(
        'bg-surface rounded-[12px] shadow-card border border-border flex gap-3 p-3 w-full transition-opacity',
        isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:opacity-80'
      )}
      aria-disabled={isOutOfStock}
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      onKeyDown={(e) => { if (!isOutOfStock && (e.key === 'Enter' || e.key === ' ')) onPress(); }}
    >
      {/* ── Image ──────────────────────────────────────────────────────────── */}
      <div className="relative flex-none w-24 h-24 rounded-xl overflow-hidden bg-brand-pink/10">
        {essence.photoUrl ? (
          <img
            src={essence.photoUrl}
            alt={essence.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          /* Pink-tinted placeholder with first letter */
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-heading font-bold text-3xl text-brand-pink/40 select-none">
              {essence.name[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Badge overlaid top-left on the image */}
        {showOriginalBadge && (
          <span className="absolute top-1 left-1 bg-brand-pink text-surface text-[9px] font-body font-medium px-1.5 py-0.5 rounded-full leading-none">
            ORIGINAL
          </span>
        )}
        {showPopularBadge && (
          <span className="absolute top-1 left-1 bg-brand-blue text-surface text-[9px] font-body font-medium px-1.5 py-0.5 rounded-full leading-none">
            POPULAR
          </span>
        )}
      </div>

      {/* ── Info ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        {/* Name */}
        <h3 className="font-heading font-semibold text-base text-text-primary leading-snug truncate">
          {essence.name}
        </h3>

        {/* Inspired by */}
        {essence.inspirationBrand && (
          <p className="text-[13px] text-muted font-body leading-snug truncate">
            Inspirado en: {essence.inspirationBrand}
          </p>
        )}

        {/* Olfactive family */}
        <p className="text-[12px] text-muted font-body leading-snug truncate">
          {essence.olfactiveFamily.name}
        </p>

        {/* Stars + review count */}
        <StarRating rating={essence.rating} reviewCount={essence.reviewCount} />

        {/* Stock status */}
        {essence.currentStockMl !== undefined && (
          <StockIndicator
            stockMl={essence.currentStockMl}
            minStockMl={essence.minStockGrams}
          />
        )}

        {/* Price + Ver más row */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="font-heading font-semibold text-brand-gold text-sm leading-none">
            Desde {formatCOP(pricePerOz)}/oz
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) onPress(); }}
            disabled={isOutOfStock}
            className={clsx(
              'text-[13px] font-body font-medium leading-none',
              isOutOfStock ? 'text-muted cursor-not-allowed' : 'text-brand-blue'
            )}
            aria-disabled={isOutOfStock}
          >
            Ver más
          </button>
        </div>
      </div>
    </article>
  );
}
