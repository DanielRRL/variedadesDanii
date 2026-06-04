import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, Product } from '../types';

const MAX_QUANTITY_PER_ITEM = 10;

interface CartState {
  items: CartItem[];
  deliveryType: 'pickup' | 'delivery';
  paymentMethod: 'NEQUI' | 'DAVIPLATA' | 'BANCOLOMBIA' | 'BREB' | 'CASH' | '';
  nequiPhone: string;
}

interface CartActions {
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  setDeliveryType: (type: CartState['deliveryType']) => void;
  setPaymentMethod: (method: CartState['paymentMethod']) => void;
  setNequiPhone: (phone: string) => void;
  subtotal: () => number;
  grandTotal: () => number;
}

export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
  items: [],
  deliveryType: 'pickup',
  paymentMethod: '',
  nequiPhone: '',

  addItem: (product, quantity = 1) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, MAX_QUANTITY_PER_ITEM);
        return {
          items: state.items.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: newQty, lineTotal: newQty * i.unitPrice }
              : i
          ),
        };
      }
      const qty = Math.min(quantity, MAX_QUANTITY_PER_ITEM);
      const item: CartItem = {
        productId: product.id,
        name: product.name,
        productType: product.productType,
        quantity: qty,
        unitPrice: product.price,
        lineTotal: qty * product.price,
        photoUrl: product.photoUrl,
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
    }),

  setDeliveryType: (type) => set({ deliveryType: type }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setNequiPhone: (phone) => set({ nequiPhone: phone }),

  subtotal: () =>
    get().items.reduce((sum, item) => sum + item.lineTotal, 0),

  grandTotal: () => get().subtotal(),
    }),
    { name: 'danii_cart', storage: createJSONStorage(() => sessionStorage) }
  )
);
