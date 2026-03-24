/**
 * adminShared.ts — Shared constants for admin pages.
 *
 * STATUS_LABELS / STATUS_COLORS / VALID_TRANSITIONS mirror the backend
 * OrderController transition rules so the UI only shows actions that
 * the server will accept.
 */

export const STATUS_LABELS: Record<string, string> = {
  PENDING:   'PENDIENTE',
  PAID:      'PAGADO',
  PREPARING: 'EN PREPARACIÓN',
  READY:     'LISTO',
  DELIVERED: 'ENTREGADO',
  CANCELLED: 'CANCELADO',
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-gray-100 text-gray-600',
  PAID:      'bg-blue-100 text-blue-700',
  PREPARING: 'bg-yellow-100 text-yellow-700',
  READY:     'bg-green-100 text-green-700',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-600',
};

/**
 * Valid next statuses per current status.
 * Mirrors backend OrderController: PENDING→PAID|CANCEL …
 * Terminal states (DELIVERED, CANCELLED) have empty arrays.
 */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING:   ['PAID', 'CANCELLED'],
  PAID:      ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY:     ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};
