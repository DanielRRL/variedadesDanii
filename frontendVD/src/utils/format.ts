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
