/**
 * Global TypeScript type definitions for Variedades DANII frontend.
 *
 * These interfaces mirror the backend Prisma models and API response shapes.
 * All monetary values are in COP (Colombian Pesos).
 */

// ─────────────────────────────────────────────────────────────────────────────
// AUTH / USER
// ─────────────────────────────────────────────────────────────────────────────

/** Loyalty program account linked to a CLIENT user. */
export interface LoyaltyAccount {
  id: string;
  /** Accumulated points (100 pts = $1,000 COP discount roughly). */
  points: number;
  /** Tier level: BASIC < PREFERRED < VIP. */
  level: 'BASIC' | 'PREFERRED' | 'VIP';
  /** Recurring percentage discount applied to every order at checkout. */
  discountPct: number;
  /** Total bottles returned — used for eco-impact gamification on ProfilePage. */
  bottleReturnsCount?: number;
}

/** A single entry in the loyalty transaction history.
 * Returned by GET /api/loyalty/transactions.
 */
export interface LoyaltyTransaction {
  id: string;
  /** Points gained (EARN) or spent (REDEEM). Sign is positive; use type to determine direction. */
  points: number;
  /** Whether points were earned or redeemed. */
  type: 'EARN' | 'REDEEM';
  /** Human-readable reason (e.g., 'Order #VD-20260001', 'Bottle return', 'Referral bonus'). */
  description: string;
  /** ISO 8601 timestamp string. */
  createdAt: string;
}

/** Order with admin-visible client info. Returned by GET /api/orders (admin view). */
export interface AdminOrder extends Order {
  client?: { id: string; name: string; email: string };
}

/** KPI data returned by GET /api/admin/dashboard. */
export interface DashboardStats {
  salesToday: number;
  salesGoal: number;
  salesPercent: number;
  ordersToday: number;
  ordersTodayVsYesterday?: number;
  averageTicket: number;
  newClientsToday: number;
  topEssences: { name: string; revenue: number; rank: number }[];
  recentOrders: AdminOrder[];
  lowStockEssences?: { name: string; stockMl: number; minStockGrams: number }[];
}

/** DIAN electronic invoice returned by GET /api/admin/invoices. */
export interface AdminInvoice {
  id: string;
  invoiceNumber?: string;
  orderId: string;
  orderNumber?: string;
  clientName?: string;
  amount: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  /** CUFE (Código Único de Factura Electrónica) — assigned when DIAN accepts the invoice. */
  cufe?: string;
  createdAt: string;
}

/** Authenticated user returned by /api/auth/login and stored in authStore. */
export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  /** True once the user has clicked the verification link sent to their email. */
  emailVerified: boolean;
  /** Controls access to admin panel, seller dashboard, etc. */
  role: 'CLIENT' | 'ADMIN' | 'SELLER' | 'DELIVERY';
  /** Included when role === 'CLIENT'. May be absent for other roles. */
  loyaltyAccount?: LoyaltyAccount;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG — OLFACTIVE FAMILIES
// ─────────────────────────────────────────────────────────────────────────────

/** Olfactive family returned by GET /api/essences/families. */
export interface OlfactiveFamily {
  id: string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG — ESSENCES
// ─────────────────────────────────────────────────────────────────────────────

/** Perfume essence available in the catalog. */
export interface Essence {
  id: string;
  name: string;
  description?: string;
  /** Olfactive family (e.g., Floral, Woody, Oriental). */
  olfactiveFamily: { id: string; name: string };
  /** Brand name that inspired this essence (e.g., "Chanel Nº5"). */
  inspirationBrand?: string;
  /** Price per milliliter in COP. Used to compute line totals in the cart. */
  pricePerMl: number;
  photoUrl?: string;
  isActive: boolean;
  /** Minimum stock threshold in grams that triggers a low-stock alert. */
  minStockGrams: number;
  /** Returned only when the endpoint includes stock data (admin / catalog with stock). */
  currentStockMl?: number;
  /** Average star rating (1–5). */
  rating?: number;
  /** Number of reviews contributing to the rating. */
  reviewCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG — BOTTLES
// ─────────────────────────────────────────────────────────────────────────────

/** Bottle option the customer can choose at checkout. */
export interface Bottle {
  id: string;
  name: string;
  /** STANDARD = basic glass; LUXURY = premium presentation box. */
  type: 'STANDARD' | 'LUXURY';
  /** Volume capacity in milliliters. */
  capacityMl: number;
  /** Price of the bottle itself in COP. */
  price: number;
  /** Discount amount in COP credited to the loyalty account when the bottle is returned. */
  returnDiscount: number;
  stockQuantity: number;
  photoUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG — PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

/** Sellable product. A PERFUME product links an essence + bottle at a fixed ml. */
export interface Product {
  id: string;
  name: string;
  /** PERFUME = essence+bottle combo; ACCESSORY = non-essence item; GENERAL = other. */
  category: 'PERFUME' | 'ACCESSORY' | 'GENERAL';
  /** Only present when category === 'PERFUME'. */
  essence?: Essence;
  /** Only present when category === 'PERFUME'. */
  bottle?: Bottle;
  /** Milliliters of essence filled into the bottle. Only for PERFUME. */
  mlQuantity?: number;
  /** Final selling price in COP (essence cost + bottle cost). */
  price: number;
  active: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single line in the shopping cart.
 * Computed client-side from the selected essence, oz/ml, bottle, and return intent.
 */
export interface CartItem {
  productId: string;
  name: string;
  essenceName: string;
  /** Ounces selected by the customer (drives ml calculation). */
  oz: number;
  /** Milliliters = oz * 29.5735 (rounded). */
  ml: number;
  bottleType: string;
  /** Bottle price in COP. */
  bottlePrice: number;
  /** Essence cost portion of the line total (ml * pricePerMl). */
  essenceSubtotal: number;
  /** Whether the customer will return the bottle for the discount. */
  returnsBottle: boolean;
  /** Discount in COP applied when returnsBottle is true. */
  returnDiscount: number;
  /** Final line total: bottlePrice + essenceSubtotal - returnDiscount (if returning). */
  lineTotal: number;
  photoUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────

/** A single product line within an order. */
export interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  /** Price at the time of purchase (snapshot, not live catalog price). */
  unitPrice: number;
  subtotal: number;
}

/** Full order entity returned by /api/orders/:id. */
export interface Order {
  id: string;
  /** Human-readable order number in format VD-YYYYXXXX. */
  orderNumber: string;
  /** Current fulfillment status. READY = prepared, awaiting pickup/delivery. */
  status: 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
  subtotal: number;
  /** Total discount applied (loyalty + promotions + bottle returns). */
  discount: number;
  total: number;
  paymentMethod: 'NEQUI' | 'BANCOLOMBIA' | 'BREB' | 'CASH';
  /** ONLINE = web order; REFILL = store refill; CASH_ON_DELIVERY = COD. */
  type: 'ONLINE' | 'REFILL' | 'CASH_ON_DELIVERY';
  items: OrderItem[];
  /** ISO 8601 timestamp string. */
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API INPUT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Payload for POST /api/auth/register. */
export interface RegisterData {
  name: string;
  phone: string;
  email: string;
  password: string;
  /** Optional referral code from another customer. */
  referralCode?: string;
}

/** Filters accepted by GET /api/essences. All fields are optional. */
export interface EssenceFilters {
  olfactiveFamily?: string;
  inspirationBrand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  /**
   * orderBy values:
   *   'name'       — alphabetical (backend default)
   *   'pricePerMl' — by price (backend native field name)
   *   'rating'     — average rating
   *   'sales'      — top-sellers (requires backend support; falls back to client-side sort)
   *   'price_asc'  — cheapest first (client-side fallback)
   *   'price_desc' — priciest first (client-side fallback)
   *   'stock'      — most available first (client-side fallback)
   */
  orderBy?: 'name' | 'pricePerMl' | 'rating' | 'sales' | 'price_asc' | 'price_desc' | 'stock';
  page?: number;
  limit?: number;
}

/** Payload for POST /api/orders. */
export interface CreateOrderInput {
  items: { productId: string; quantity: number }[];
  paymentMethod: Order['paymentMethod'];
  type: Order['type'];
  deliveryAddress?: string;
  /** Points the customer wants to redeem for a discount. */
  pointsToRedeem?: number;
  referralCode?: string;
  /** Optional customer notes attached to the order. */
  notes?: string;
}

/** Payload for POST /api/payments/initiate (Wompi). */
export interface PaymentInitInput {
  orderId: string;
  /** Amount in Colombian centavos (COP * 100). */
  amountInCents: number;
  customerEmail: string;
  redirectUrl: string;
}

/** Payload for POST /api/returns (bottle return). */
export interface BottleReturnInput {
  bottleId: string;
  orderId: string;
  quantity: number;
}
