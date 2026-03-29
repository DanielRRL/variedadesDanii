/**
 * cartStore.ts — In-memory shopping cart state.
 *
 * The cart handles PRODUCTS (lotions, creams, splashes, etc.) — not essence + oz
 * configurations. Each CartItem tracks a product with quantity and computed lineTotal.
 *
 * The cart is intentionally NOT persisted to localStorage to avoid stale
 * product/price data between sessions. It is cleared after a successful
 * order creation via clearCart().
 *
 * Usage:
 *   const { items, grandTotal, addItem, removeItem } = useCartStore();
 */

import { create } from 'zustand';
import type { CartItem, Product } from '../types';

/** Maximum units of a single product allowed in the cart. */
const MAX_QUANTITY_PER_ITEM = 10;

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

  /** Applied referral code (gives 5% discount on eligible items). */
  referralCodeApplied: string;

  /** Referral discount percentage (0-5). Set when the code is validated. */
  referralDiscountAmount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions + computed getters
// ─────────────────────────────────────────────────────────────────────────────

interface CartActions {
  /**
   * Add a product to the cart. If it already exists, increment quantity.
   * Max quantity per item is 10.
   */
  addItem: (product: Product, quantity?: number) => void;

  /** Remove the item matching the given productId from the cart. */
  removeItem: (productId: string) => void;

  /** Update quantity for a product. qty=0 removes the item. */
  updateQuantity: (productId: string, qty: number) => void;

  /** Empty the cart entirely. Call after successful order creation. */
  clearCart: () => void;

  /** Switch between pickup at the store and home delivery. */
  setDeliveryType: (type: CartState['deliveryType']) => void;

  /** Update the selected payment method. */
  setPaymentMethod: (method: CartState['paymentMethod']) => void;

  /** Store the Nequi phone number entered by the customer. */
  setNequiPhone: (phone: string) => void;

  /** Apply a validated referral code with its discount percentage. */
  applyReferralCode: (code: string, discountPct: number) => void;

  /** Remove the applied referral code. */
  clearReferralCode: () => void;

  // ── Computed values (derived from items) ──────────────────────────────────

  /** Sum of lineTotal for all items, before any discount. */
  subtotal: () => number;

  /** Count of items where generatesGram === true. Each qualifying item earns 1g per unit. */
  gramPreview: () => number;

  /** Referral discount = subtotal * referralDiscountAmount / 100 (max 5%). */
  referralDiscount: () => number;

  /**
   * Amount the customer actually pays: subtotal - referralDiscount.
   * This is an estimate; the server recalculates with all rules.
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
  referralCodeApplied: '',
  referralDiscountAmount: 0,

  // ── Mutating actions ───────────────────────────────────────────────────────

  addItem: (product, quantity = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing) {
        // Increment quantity — capped at MAX_QUANTITY_PER_ITEM
        const newQty = Math.min(existing.quantity + quantity, MAX_QUANTITY_PER_ITEM);
        return {
          items: state.items.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: newQty, lineTotal: newQty * i.unitPrice }
              : i
          ),
        };
      }
      // New item
      const qty = Math.min(quantity, MAX_QUANTITY_PER_ITEM);
      const item: CartItem = {
        productId: product.id,
        name: product.name,
        productType: product.productType,
        quantity: qty,
        unitPrice: product.price,
        lineTotal: qty * product.price,
        photoUrl: product.photoUrl,
        generatesGram: product.generatesGram,
      };
      return { items: [...state.items, item] };
    }),

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),

  updateQuantity: (productId, qty) =>
    set((state) => {
      if (qty <= 0) {
        return { items: state.items.filter((i) => i.productId !== productId) };
      }
      const capped = Math.min(qty, MAX_QUANTITY_PER_ITEM);
      return {
        items: state.items.map((i) =>
          i.productId === productId
            ? { ...i, quantity: capped, lineTotal: capped * i.unitPrice }
            : i
        ),
      };
    }),

  clearCart: () =>
    set({
      items: [],
      paymentMethod: '',
      nequiPhone: '',
      referralCodeApplied: '',
      referralDiscountAmount: 0,
    }),

  setDeliveryType: (type) =>
    set({ deliveryType: type }),

  setPaymentMethod: (method) =>
    set({ paymentMethod: method }),

  setNequiPhone: (phone) =>
    set({ nequiPhone: phone }),

  applyReferralCode: (code, discountPct) =>
    set({ referralCodeApplied: code, referralDiscountAmount: Math.min(discountPct, 5) }),

  clearReferralCode: () =>
    set({ referralCodeApplied: '', referralDiscountAmount: 0 }),

  // ── Computed getters ───────────────────────────────────────────────────────

  // subtotal = sum of all lineTotal (quantity * unitPrice per item)
  subtotal: () =>
    get().items.reduce((sum, item) => sum + item.lineTotal, 0),

  // gramPreview = total qualifying items that earn grams (1g per unit of generatesGram product)
  gramPreview: () =>
    get().items.reduce(
      (sum, item) => sum + (item.generatesGram ? item.quantity : 0),
      0
    ),

  // referralDiscount = subtotal * referralDiscountAmount / 100 (capped at 5%)
  referralDiscount: () => {
    const { subtotal, referralDiscountAmount } = get();
    return Math.round(subtotal() * Math.min(referralDiscountAmount, 5) / 100);
  },

  // grandTotal = subtotal - referralDiscount (delivery fee handled server-side)
  grandTotal: () => {
    const { subtotal, referralDiscount } = get();
    return Math.max(subtotal() - referralDiscount(), 0);
  },
}));
