/**
 * priceCalculator.ts — All pricing constants and utilities.
 *
 * Essence prices are GLOBAL and fixed. All essences cost the same.
 * The price depends only on the selected size (1oz / 2oz / 3oz)
 * and whether it's a new bottle or a refill (in-store only).
 */

/** 1 fluid ounce in milliliters (exact NIST value). */
export const OZ_TO_ML = 29.5735;

// ─────────────────────────────────────────────────────────────────────────────
// Global essence pricing
// ─────────────────────────────────────────────────────────────────────────────

/** Essence prices — new bottle. */
export const ESSENCE_PRICE_1OZ = 16_000;
export const ESSENCE_PRICE_2OZ = 29_000;
export const ESSENCE_PRICE_3OZ = 44_000;

/** Essence refill prices — in-store only. */
export const REFILL_PRICE_1OZ = 14_000;
export const REFILL_PRICE_2OZ = 27_000;
export const REFILL_PRICE_3OZ = 42_000;

/** Price per extra gram (added on top of oz, in-store only). */
export const GRAM_PRICE = 1_000;

/** ── Delivery ────────────────────────────────────────────────────────────── */
export const DELIVERY_FEE = 5_000;

// ─────────────────────────────────────────────────────────────────────────────
// Price lookup
// ─────────────────────────────────────────────────────────────────────────────

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

export function buildOzOptions(isRefill: boolean = false): Array<{ oz: number; ml: number; price: number }> {
  return [1, 2, 3].map((oz) => ({
    oz,
    ml: Math.round(oz * OZ_TO_ML * 100) / 100,
    price: getEssencePrice(oz, isRefill),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Gram gamification utilities
// ─────────────────────────────────────────────────────────────────────────────

/** 13 grams converts to 1 free ounce of essence. */
export const GRAMS_PER_OZ = 13;

/** Progress percentage toward the next free ounce (0–100). */
export function gramProgress(currentGrams: number): number {
  return Math.min(100, Math.round((currentGrams / GRAMS_PER_OZ) * 100));
}

/** How many full ounces can be redeemed from grams. */
export function gramsToOz(grams: number): number {
  return Math.floor(grams / GRAMS_PER_OZ);
}

/** Convert ounces back to grams. */
export function ozToGrams(oz: number): number {
  return oz * GRAMS_PER_OZ;
}

/** Grams remaining until the next full ounce. */
export function gramsUntilNextOz(currentGrams: number): number {
  const remainder = currentGrams % GRAMS_PER_OZ;
  return remainder === 0 && currentGrams > 0 ? 0 : GRAMS_PER_OZ - remainder;
}

/** Apply a referral discount percentage to a subtotal. */
export function calculateReferralDiscount(subtotal: number, discountPct: number): number {
  return Math.round(subtotal * (discountPct / 100));
}

/** Calculate delivery fee based on delivery type. */
export function calculateDeliveryFee(deliveryType: 'PICKUP' | 'DELIVERY'): number {
  return deliveryType === 'PICKUP' ? 0 : DELIVERY_FEE;
}
