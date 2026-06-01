/**
 * EssenceCard — Premium horizontal catalog card for a single perfume essence.
 *
 * Layout:
 *   [Image 120px] | [Name, inspired by, family, stars, stock, price, "Ver más"]
 *
 * Badges overlaid on image: "ORIGINAL" (gold), "POPULAR" (pink).
 * Out-of-stock state dims and disables interaction.
 */

import { Star } from "lucide-react";
import { clsx } from "clsx";
import type { Essence } from "../../types";
import { StockIndicator } from "./StockIndicator";
import { formatCOP } from "../../utils/format";

const PREMIUM_BRANDS = [
  "Chanel", "Dior", "Yves Saint Laurent", "YSL", "Givenchy", "Hermès", "Hermes",
  "Guerlain", "Lancôme", "Lancome", "Prada", "Versace", "Armani", "Giorgio Armani",
  "Tom Ford", "Dolce & Gabbana", "Valentino", "Burberry", "Balenciaga",
];

function isPremiumBrand(brand: string | undefined): boolean {
  if (!brand) return false;
  return PREMIUM_BRANDS.some((b) => brand.toLowerCase().includes(b.toLowerCase()));
}

// ─── StarRating ─────────────────────────────────────────────────────────────

function StarRating({ rating = 0, reviewCount = 0 }: { rating?: number; reviewCount?: number }) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = rating >= i + 1;
    const half = !filled && rating >= i + 0.5;
    return { filled, half };
  });

  return (
    <div className="flex items-center gap-0.5">
      {stars.map(({ filled, half }, i) => (
        <span key={i} className="relative inline-flex">
          <Star size={13} className="text-slate-200" strokeWidth={1.5} />
          {(filled || half) && (
            <span className="absolute inset-0 overflow-hidden" style={{ width: half ? "50%" : "100%" }}>
              <Star size={13} className="text-brand-gold fill-brand-gold" strokeWidth={1.5} />
            </span>
          )}
        </span>
      ))}
      {reviewCount > 0 && (
        <span className="text-[11px] text-slate-400 ml-1">
          ({reviewCount})
        </span>
      )}
    </div>
  );
}

// ─── EssenceCard ────────────────────────────────────────────────────────────

export interface EssenceCardProps {
  essence: Essence;
  onPress: () => void;
  className?: string;
}

export function EssenceCard({ essence, onPress, className }: EssenceCardProps) {
  const isOutOfStock = essence.currentStockMl === 0;
  const pricePerOz = (essence.pricePerMl ?? 0) * 29.5735;

  const showOriginalBadge = isPremiumBrand(essence.inspirationBrand);
  const showPopularBadge = !showOriginalBadge && (essence.rating ?? 0) >= 4.5;

  return (
    <article
      onClick={isOutOfStock ? undefined : onPress}
      className={clsx(
        "bg-white rounded-2xl border border-slate-200/60 shadow-sm flex gap-4 p-4 w-full",
        "transition-all duration-300",
        !isOutOfStock && "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-brand-pink/20",
        isOutOfStock && "opacity-60 cursor-not-allowed",
        className
      )}
      aria-disabled={isOutOfStock}
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      onKeyDown={(e) => { if (!isOutOfStock && (e.key === "Enter" || e.key === " ")) onPress(); }}
    >
      {/* Image */}
      <div className="relative flex-none w-[120px] h-[120px] rounded-xl overflow-hidden bg-brand-pink/5">
        {essence.photoUrl ? (
          <img
            src={essence.photoUrl}
            alt={essence.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-display font-bold text-4xl text-brand-pink/25 select-none">
              {essence.name[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {showOriginalBadge && (
          <span className="absolute top-2 left-2 bg-brand-gold/90 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
            ORIGINAL
          </span>
        )}
        {showPopularBadge && (
          <span className="absolute top-2 left-2 bg-brand-pink/90 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
            POPULAR
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <h3 className="font-heading font-semibold text-base text-slate-800 leading-snug truncate">
          {essence.name}
        </h3>

        {essence.inspirationBrand && (
          <p className="text-xs text-slate-500 truncate">
            Inspirado en: {essence.inspirationBrand}
          </p>
        )}

        <p className="text-[11px] text-slate-400 truncate">
          {essence.olfactiveFamily.name}
        </p>

        <StarRating rating={essence.rating} reviewCount={essence.reviewCount} />

        {essence.currentStockMl !== undefined && (
          <StockIndicator
            stockMl={essence.currentStockMl}
            minStockMl={essence.minStockGrams ?? 30}
          />
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="font-heading font-semibold text-brand-gold text-sm">
            Desde {formatCOP(pricePerOz)}/oz
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) onPress(); }}
            disabled={isOutOfStock}
            className={clsx(
              "text-[13px] font-semibold transition-colors",
              isOutOfStock
                ? "text-slate-300 cursor-not-allowed"
                : "text-brand-blue hover:text-brand-blue/80"
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
