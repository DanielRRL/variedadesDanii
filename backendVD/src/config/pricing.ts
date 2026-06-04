/**
 * Pricing constants — shared across backend.
 *
 * Essence prices are GLOBAL and fixed. All essences cost the same.
 * There is no pricePerMl per essence — the price depends only on
 * the selected size (1oz / 2oz / 3oz) and whether it's a new bottle
 * or a refill (in-store only).
 */

/** ── Essence prices (new bottle) ───────────────────────────────────────── */
export const ESSENCE_PRICE_1OZ = 16_000;
export const ESSENCE_PRICE_2OZ = 29_000;
export const ESSENCE_PRICE_3OZ = 44_000;

/** ── Essence refill prices (in-store only) ──────────────────────────────── */
export const REFILL_PRICE_1OZ = 14_000;
export const REFILL_PRICE_2OZ = 27_000;
export const REFILL_PRICE_3OZ = 42_000;

/** Price per extra gram (added on top of oz, in-store only). */
export const GRAM_PRICE = 1_000;

/** ── Delivery ────────────────────────────────────────────────────────────── */
export const DELIVERY_FEE = 5_000;

/** ── Unit conversions ────────────────────────────────────────────────────── */
/** 1 fluid ounce = 29.5735 ml (NIST standard). */
export const OZ_TO_ML = 29.5735;

/** Essence ml actually used per oz (not total final product volume including alcohol/pheromones). */
export const ESSENCE_ML_PER_OZ: Record<number, number> = {
  1: 13,
  2: 22,
  3: 33,
};

/** Returns the essence ml required for a given oz size. */
export function getEssenceMlForOz(oz: number): number {
  return ESSENCE_ML_PER_OZ[oz] ?? Math.round(oz * 13);
}

/** Derives the essence ml from a product's mlQuantity (total final product volume). */
export function getEssenceMlFromProductMl(mlQuantity: number): number {
  const oz = Math.round(mlQuantity / OZ_TO_ML);
  return getEssenceMlForOz(oz);
}

/** ── Price lookup helpers ────────────────────────────────────────────────── */

const NEW_PRICES: Record<number, number> = {
  1: ESSENCE_PRICE_1OZ,
  2: ESSENCE_PRICE_2OZ,
  3: ESSENCE_PRICE_3OZ,
};

const REFILL_PRICES: Record<number, number> = {
  1: REFILL_PRICE_1OZ,
  2: REFILL_PRICE_2OZ,
  3: REFILL_PRICE_3OZ,
};

export function getEssencePrice(oz: number, isRefill: boolean = false): number {
  const table = isRefill ? REFILL_PRICES : NEW_PRICES;
  return table[oz] ?? oz * ESSENCE_PRICE_1OZ;
}

export function getEssencePriceWithGrams(
  oz: number,
  extraGrams: number = 0,
  isRefill: boolean = false,
): { basePrice: number; gramCost: number; total: number } {
  const basePrice = getEssencePrice(oz, isRefill);
  const gramCost = extraGrams * GRAM_PRICE;
  return { basePrice, gramCost, total: basePrice + gramCost };
}
