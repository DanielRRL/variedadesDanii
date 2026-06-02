/**
 * format.ts — Shared formatting utilities.
 */

/**
 * Format a COP amount with dot-separated thousands and a $ prefix.
 * @example formatCOP(9000)  // "$9.000"
 * @example formatCOP(19375) // "$19.375"
 */
export function formatCOP(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('es-CO');
}

/**
 * Split a COP amount into parts for editorial typography.
 * The main integer (before first separator) is displayed large;
 * the rest is shown at lower opacity.
 *
 * @example formatCOPSplit(52300)  // { symbol: "$", pesos: "52", cents: ".300" }
 * @example formatCOPSplit(9000)   // { symbol: "$", pesos: "9", cents: ".000" }
 * @example formatCOPSplit(100)    // { symbol: "$", pesos: "100", cents: "" }
 */
export function formatCOPSplit(amount: number): {
  symbol: string;
  pesos: string;
  cents: string;
} {
  const formatted = formatCOP(amount);
  const symbol = formatted[0]; // "$"
  const number = formatted.slice(1); // "52.300"
  const dotIndex = number.indexOf('.');
  if (dotIndex === -1) {
    return { symbol, pesos: number, cents: '' };
  }
  return {
    symbol,
    pesos: number.slice(0, dotIndex),
    cents: number.slice(dotIndex),
  };
}
