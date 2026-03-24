/**
 * cartStore.ts — In-memory shopping cart state.
 *
 * The cart is intentionally NOT persisted to localStorage to avoid stale
 * product/price data between sessions. It is cleared after a successful
 * order creation via clearCart().
 *
 * Usage:
 *   const { items, grandTotal, addItem, removeItem } = useCartStore();
 */

import { create } from 'zustand';
import type { CartItem } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

interface CartState {
  /** Line items selected by the customer. */
  items: CartItem[];

  /** How the order will be fulfilled. */
  deliveryType: 'pickup' | 'delivery';

  /**
   * Payment method selected at checkout.
   * Matches Order['paymentMethod'] from types/index.ts.
   */
  paymentMethod: 'NEQUI' | 'BANCOLOMBIA' | 'BREB' | 'CASH' | '';

  /**
   * Phone number for Nequi payments.
   * Only required when paymentMethod === 'NEQUI'.
   */
  nequiPhone: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions + computed getters
// ─────────────────────────────────────────────────────────────────────────────

interface CartActions {
  /** Add a new item to the cart (no deduplication — each call adds a new line). */
  addItem: (item: CartItem) => void;

  /** Remove the item at the given index from the cart. */
  removeItem: (index: number) => void;

  /** Empty the cart entirely. Call after successful order creation. */
  clearCart: () => void;

  /** Switch between pickup at the store and home delivery. */
  setDeliveryType: (type: CartState['deliveryType']) => void;

  /** Update the selected payment method. */
  setPaymentMethod: (method: CartState['paymentMethod']) => void;

  /** Store the Nequi phone number entered by the customer. */
  setNequiPhone: (phone: string) => void;

  // ── Computed values (derived from items) ──────────────────────────────────

  /** Sum of lineTotal for all items, before any discount. */
  subtotal: () => number;

  /**
   * Total discount = sum of all returnDiscount amounts for items where
   * returnsBottle === true. Loyalty discounts are applied server-side.
   */
  totalDiscount: () => number;

  /**
   * Amount the customer actually pays: subtotal - totalDiscount.
   * This is an estimate; the server recalculates with loyalty / promo rules.
   */
  grandTotal: () => number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useCartStore = create<CartState & CartActions>()((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  items: [],
  deliveryType: 'pickup',
  paymentMethod: '',
  nequiPhone: '',

  // ── Mutating actions ───────────────────────────────────────────────────────
  addItem: (item) =>
    set((state) => ({ items: [...state.items, item] })),

  removeItem: (index) =>
    set((state) => ({
      items: state.items.filter((_, i) => i !== index),
    })),

  clearCart: () =>
    set({ items: [], paymentMethod: '', nequiPhone: '' }),

  setDeliveryType: (type) =>
    set({ deliveryType: type }),

  setPaymentMethod: (method) =>
    set({ paymentMethod: method }),

  setNequiPhone: (phone) =>
    set({ nequiPhone: phone }),

  // ── Computed getters ───────────────────────────────────────────────────────
  subtotal: () =>
    get().items.reduce((sum, item) => sum + item.lineTotal, 0),

  totalDiscount: () =>
    get().items.reduce(
      (sum, item) => sum + (item.returnsBottle ? item.returnDiscount : 0),
      0
    ),

  grandTotal: () => {
    const { subtotal, totalDiscount } = get();
    return subtotal() - totalDiscount();
  },
}));
