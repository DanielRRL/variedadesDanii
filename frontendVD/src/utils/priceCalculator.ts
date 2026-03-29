/**
 * priceCalculator.ts — All price calculations for the order configurator.
 *
 * IMPORTANT: These calculations MUST match the backend CreateOrderUseCase logic.
 * If the backend formula changes, update this file too.
 * The server re-validates all totals at order creation time; these values are
 * used only to show the customer a price preview before checkout.
 */

/** 1 fluid ounce in milliliters (exact NIST value). */
export const OZ_TO_ML = 29.5735;

// ─────────────────────────────────────────────────────────────────────────────
// Core calculations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the essence cost for a given number of ounces.
 *
 * @param pricePerMl - Price per milliliter in COP (from Essence.pricePerMl).
 * @param oz         - Number of ounces the customer selected (1, 2, or 3).
 * @returns Cost in COP, rounded to the nearest peso.
 *
 * @example calculateEssencePrice(320, 1) // 320 * 1 * 29.5735 ≈ 9,464 COP
 */
export function calculateEssencePrice(pricePerMl: number, oz: number): number {
  return Math.round(pricePerMl * oz * OZ_TO_ML);
}

/**
 * Build the standard oz option set displayed in the order configurator.
 *
 * Returns an array of three options: 1 oz, 2 oz, 3 oz.
 * ml values are rounded to 2 decimal places for display purposes only.
 *
 * @param pricePerMl - Price per milliliter in COP.
 * @returns Array of { oz, ml, price } option objects.
 *
 * @example
 *   calculateOzOptions(320)
 *   // [{ oz: 1, ml: 29.57, price: 9464 },
 *   //  { oz: 2, ml: 59.15, price: 18929 },
 *   //  { oz: 3, ml: 88.72, price: 28393 }]
 */
export function calculateOzOptions(
  pricePerMl: number
): Array<{ oz: number; ml: number; price: number }> {
  return [1, 2, 3].map((oz) => ({
    oz,
    ml: Math.round(oz * OZ_TO_ML * 100) / 100,
    price: calculateEssencePrice(pricePerMl, oz),
  }));
}

/**
 * Calculate the total price of a single cart line.
 *
 * @param essencePrice    - Calculated via calculateEssencePrice().
 * @param bottlePrice     - From Bottle.price in COP.
 * @param returnDiscount  - From Bottle.returnDiscount in COP.
 * @param returnsBottle   - Whether the customer is returning an old bottle.
 * @returns Line total in COP.
 *
 * @example
 *   calculateLineTotal(9464, 8000, 2000, true)  // 9464 + 8000 - 2000 = 15,464
 *   calculateLineTotal(9464, 8000, 2000, false) // 9464 + 8000 = 17,464
 */
export function calculateLineTotal(
  essencePrice: number,
  bottlePrice: number,
  returnDiscount: number,
  returnsBottle: boolean
): number {
  return essencePrice + bottlePrice - (returnsBottle ? returnDiscount : 0);
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
  return deliveryType === 'PICKUP' ? 0 : 5_000;
}
