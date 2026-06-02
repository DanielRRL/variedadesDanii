/**
 * adminShared.ts — Shared constants for admin pages.
 *
 * STATUS_LABELS — Display labels for each order status badge.
 * STATUS_COLORS — Tailwind color pairs for status badges.
 * VALID_TRANSITIONS — Mirrors backend OrderController transition rules.
 * TRANSITION_LABELS — Action-oriented labels for status change buttons.
 */

export const STATUS_LABELS: Record<string, string> = {
  PENDING:   'PENDIENTE',
  PAID:      'PAGO CONFIRMADO',
  PREPARING: 'EN PREPARACIÓN',
  READY:     'LISTO PARA ENTREGA',
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
 * Mirrors backend OrderController: PENDING→PAID|CANCEL, PAID→READY|CANCEL, READY→DELIVERED.
 * Terminal states (DELIVERED, CANCELLED) have empty arrays.
 */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING:   ['PAID', 'CANCELLED'],
  PAID:      ['READY', 'CANCELLED'],
  PREPARING: [],
  READY:     ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Action-oriented labels for status transition buttons.
 * Shows what the admin actually does, not just the target status name.
 */
export const TRANSITION_LABELS: Record<string, string> = {
  PAID:      'Confirmar pago',
  READY:     'Marcar como listo',
  DELIVERED: 'Marcar como entregado',
  CANCELLED: 'Cancelar pedido',
};
