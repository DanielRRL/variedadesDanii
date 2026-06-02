/**
 * EssenceCard — Vertical catalog card for a single perfume essence.
 *
 * Layout: [Image 4:3] | [Name, brand, family, stars, stock, price, "Ver detalles"]
 *
 * Badges overlaid on image: "ORIGINAL" (gold), "POPULAR" (pink).
 * Out-of-stock state dims and disables interaction.
 */

import { Star } from "lucide-react";
import { clsx } from "clsx";
import type { Essence } from "../../types";
import { formatCOP } from "../../utils/format";
import "../../css/EssenceCard.css";

const PREMIUM_BRANDS = [
  "Chanel", "Dior", "Yves Saint Laurent", "YSL", "Givenchy", "Hermès", "Hermes",
  "Guerlain", "Lancôme", "Lancome", "Prada", "Versace", "Armani", "Giorgio Armani",
  "Tom Ford", "Dolce & Gabbana", "Valentino", "Burberry", "Balenciaga",
];

function isPremiumBrand(brand: string | undefined): boolean {
  if (!brand) return false;
  return PREMIUM_BRANDS.some((b) => brand.toLowerCase().includes(b.toLowerCase()));
}

function StarRating({ rating = 0, reviewCount = 0 }: { rating?: number; reviewCount?: number }) {
  return (
    <div className="essence-card__rating">
      {Array.from({ length: 5 }, (_, i) => {
        const fillPct = Math.max(0, Math.min(100, (rating - i) * 100));
        return (
          <span key={i} className="essence-card__stars">
            <Star size={12} strokeWidth={1.5} />
            {fillPct > 0 && (
              <span className="essence-card__stars-fill" style={{ width: `${fillPct}%` }}>
                <Star size={12} strokeWidth={1.5} />
              </span>
            )}
          </span>
        );
      })}
      {reviewCount > 0 && (
        <span className="essence-card__rating-count">({reviewCount})</span>
      )}
    </div>
  );
}

export interface EssenceCardProps {
  essence: Essence;
  onPress: () => void;
  className?: string;
}

export function EssenceCard({ essence, onPress, className }: EssenceCardProps) {
  const isOutOfStock = essence.currentStockMl === 0;
  const lowStock = essence.currentStockMl !== undefined
    && essence.currentStockMl > 0
    && essence.currentStockMl < (essence.minStockGrams ?? 30);
  const pricePerOz = (essence.pricePerMl ?? 0) * 29.5735;

  const showOriginalBadge = isPremiumBrand(essence.inspirationBrand);
  const showPopularBadge = !showOriginalBadge && (essence.rating ?? 0) >= 4.5;

  return (
    <article
      onClick={isOutOfStock ? undefined : onPress}
      className={clsx("essence-card", isOutOfStock && "essence-card--out-of-stock", className)}
      aria-disabled={isOutOfStock}
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      onKeyDown={(e) => { if (!isOutOfStock && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPress(); } }}
    >
      {/* Image */}
      <div className="essence-card__image-area">
        {essence.photoUrl ? (
          <img
            src={essence.photoUrl}
            alt={essence.name}
            className="essence-card__image"
            loading="lazy"
          />
        ) : (
          <div className="essence-card__image-placeholder">
            <span>{essence.name[0]?.toUpperCase()}</span>
          </div>
        )}

        {showOriginalBadge && (
          <span className="essence-card__badge essence-card__badge--original">
            ORIGINAL
          </span>
        )}
        {showPopularBadge && (
          <span className="essence-card__badge essence-card__badge--popular">
            POPULAR
          </span>
        )}
      </div>

      {/* Info */}
      <div className="essence-card__info">
        <h3 className="essence-card__name">{essence.name}</h3>

        {essence.inspirationBrand && (
          <p className="essence-card__brand">Inspirado en: {essence.inspirationBrand}</p>
        )}

        <p className="essence-card__family">{essence.olfactiveFamily.name}</p>

        <StarRating rating={essence.rating} reviewCount={essence.reviewCount} />

        <p className="essence-card__price">
          {formatCOP(pricePerOz)}
          <span className="essence-card__price-unit"> /oz</span>
        </p>

        {/* Stock indicator */}
        <div className="essence-card__stock">
          <span
            className={clsx(
              "essence-card__stock-dot",
              isOutOfStock ? "essence-card__stock-dot--out" : lowStock ? "essence-card__stock-dot--low" : "essence-card__stock-dot--ok",
            )}
          />
          <span className="essence-card__stock-text">
            {isOutOfStock ? "Agotado" : lowStock ? "Pocas unidades" : "Disponible"}
          </span>
        </div>

        {/* Detail button */}
        <button
          onClick={(e) => { e.stopPropagation(); if (!isOutOfStock) onPress(); }}
          disabled={isOutOfStock}
          className={clsx(
            "essence-card__detail-btn",
            isOutOfStock && "essence-card__detail-btn--disabled",
          )}
          aria-disabled={isOutOfStock}
        >
          Ver detalles
        </button>
      </div>
    </article>
  );
}
