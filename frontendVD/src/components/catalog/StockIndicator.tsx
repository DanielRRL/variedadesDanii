/**
 * StockIndicator — Maps essence stock to one of three UX states.
 *
 * The backend returns currentStockMl via GET /api/essences (or GET /api/essences/:id).
 * This component translates that raw number into feedback the customer can act on.
 *
 * States:
 *  - stockMl === 0                 → red   "Agotado"
 *  - 0 < stockMl < minStockMl     → orange "Pocas unidades — N oz disponibles"
 *  - stockMl >= minStockMl        → green  "Disponible"
 *
 * Used in EssenceCard (catalog list) and EssenceDetailPage.
 */

import { clsx } from 'clsx';
import { OZ_TO_ML } from '../../utils/priceCalculator';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StockIndicatorProps {
  /** Current stock in milliliters (Essence.currentStockMl from the API). */
  stockMl: number;
  /**
   * Minimum stock threshold in milliliters below which "Pocas unidades" is shown.
   * Mapped from Essence.minStockGrams (backend uses grams but currentStockMl is in ml;
   * the calling component should align the units — use minStockGrams as a rough proxy
   * since most essences have density ~1 g/ml).
   */
  minStockMl: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Small pill showing real-time stock availability.
 * Designed to be inline with other metadata (stars, family, etc.)
 */
export function StockIndicator({ stockMl, minStockMl }: StockIndicatorProps) {
  if (stockMl === 0) {
    return (
      <span
        className={clsx(
          'inline-flex items-center self-start rounded-full px-2 py-0.5',
          'bg-warning/10 border border-warning/30'
        )}
        aria-label="Sin stock"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-warning mr-1.5 flex-none" />
        <span className="text-[11px] text-warning font-body leading-none">
          Agotado
        </span>
      </span>
    );
  }

  if (stockMl < minStockMl) {
    // Show remaining stock in oz so the customer knows how many orders are possible.
    const remainingOz = Math.floor(stockMl / OZ_TO_ML);
    return (
      <span
        className={clsx(
          'inline-flex items-center self-start rounded-full px-2 py-0.5',
          'bg-warning/10 border border-warning/30'
        )}
        aria-label={`Pocas unidades: ${remainingOz} oz disponibles`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-warning mr-1.5 flex-none" />
        <span className="text-[11px] text-warning font-body leading-none">
          Pocas unidades · {remainingOz} oz
        </span>
      </span>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center self-start rounded-full px-2 py-0.5',
        'bg-success/10 border border-success/30'
      )}
      aria-label="Disponible"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 flex-none" />
      <span className="text-[11px] text-success font-body leading-none">
        Disponible
      </span>
    </span>
  );
}
