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
// GAMIFICATION — GRAMS, TOKENS, REDEMPTIONS, CHALLENGES
// ─────────────────────────────────────────────────────────────────────────────

/** GramAccount — billetera de gramos del sistema de gamificacion.
 * Cada compra genera 1g. Al llegar a 13g se puede canjear por 1 oz de esencia.
 */
export interface GramAccount {
  id: string;
  /** Gramos actuales (0-13). Al llegar a 13 se convierte automaticamente en 1 oz de esencia. */
  currentGrams: number;
  /** Total historico ganado (nunca decrece). */
  totalEarned: number;
  /** Total historico canjeado. */
  totalRedeemed: number;
  /** Compras confirmadas. Canje habilitado desde 5. */
  totalPurchases: number;
  /** true cuando totalPurchases >= 5 */
  canRedeem: boolean;
  /** Canjes pendientes de entrega — incluidos solo en getMyGramAccount. */
  pendingRedemptions?: EssenceRedemption[];
}

/** GramTransaction — movimiento individual en la billetera de gramos.
 * sourceType indica el origen: compra, juego, canje, etc.
 */
export interface GramTransaction {
  id: string;
  /** Tipo de fuente que genero esta transaccion. */
  sourceType: 'PRODUCT_PURCHASE' | 'ESSENCE_OZ_BONUS' | 'GAME_ROULETTE' | 'GAME_PUZZLE' |
              'WEEKLY_CHALLENGE' | 'MONTHLY_RANKING' | 'ADMIN_ADJUSTMENT' | 'REDEMPTION';
  /** Positivo = ganancia, negativo = canje. */
  gramsDelta: number;
  /** Descripcion legible del movimiento. */
  description: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** GameToken — ficha de juego entregada tras compra confirmada.
 * El usuario juega ruleta o puzzle para ganar gramos extra.
 */
export interface GameToken {
  id: string;
  /** PENDING = sin usar, USED = ya jugado, EXPIRED = venció sin usar. */
  status: 'PENDING' | 'USED' | 'EXPIRED';
  /** Tipo de juego elegido al jugar la ficha. Solo presente cuando status !== PENDING. */
  gameType?: 'ROULETTE' | 'PUZZLE';
  /** Gramos ganados al jugar (0 si perdio). */
  gramsWon: number;
  /** ISO string — el frontend muestra cuenta regresiva hasta esta fecha. */
  expiresAt: string;
  /** ISO string del momento en que se jugo. */
  playedAt?: string;
  /** ISO string de creacion. */
  createdAt: string;
  /** Horas restantes antes de expirar — calculado client-side desde expiresAt. */
  hoursLeft?: number;
}

/** EssenceRedemption — canje de 13 gramos por 1 oz de esencia.
 * El admin marca cuando entrega fisicamente la esencia al cliente.
 */
export interface EssenceRedemption {
  id: string;
  /** Gramos consumidos en este canje. */
  gramsUsed: number;
  /** Onzas canjeadas (normalmente 1). */
  ozRedeemed: number;
  /** Nombre de la esencia elegida. */
  essenceName: string;
  /** UUID de la esencia del catalogo (opcional si fue texto libre). */
  essenceId?: string;
  /** PENDING_DELIVERY = esperando entrega, DELIVERED = entregado, CANCELLED = cancelado con reembolso. */
  status: 'PENDING_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  /** Notas del admin (motivo de cancelacion, observaciones). */
  adminNotes?: string;
  /** ISO string del momento de entrega. */
  deliveredAt?: string;
  /** ISO string de creacion. */
  createdAt: string;
}

/** WeeklyChallenge — desafio semanal que otorga gramos bonus al completar X compras.
 * El admin crea uno por semana; los clientes ven su progreso en la app.
 */
export interface WeeklyChallenge {
  id: string;
  /** Descripcion del desafio (e.g., "Compra 3 productos esta semana"). */
  description: string;
  /** Gramos de recompensa al completar el desafio. */
  gramReward: number;
  /** Compras requeridas para completar. */
  requiredPurchases: number;
  /** ISO string — inicio de la semana del desafio. */
  weekStart: string;
  /** ISO string — fin de la semana del desafio. */
  weekEnd: string;
  /** Si el desafio esta activo. */
  active: boolean;
  /** Progreso del usuario autenticado — solo incluido cuando hay sesion activa. */
  myProgress?: { purchasesCount: number; completed: boolean };
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALOG — OLFACTIVE FAMILIES
// ─────────────────────────────────────────────────────────────────────────────

/** Olfactive family returned by GET /api/essences/families. */
export interface OlfactiveFamily {
  id: string;
  name: string;
}

/** House / fragrance brand returned by GET /api/essences/houses. */
export interface House {
  id: string;
  name: string;
  /** Identifier handle without @, e.g. "carolinaherrera". */
  handle: string;
  description?: string;
  logoUrl?: string;
  active: boolean;
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
  /** House / brand this essence belongs to. */
  house?: { id: string; name: string; handle: string };
  houseId?: string;
  /** Price per milliliter in COP. Used to compute line totals in the cart. */
  pricePerMl?: number;
  photoUrl?: string;
  isActive?: boolean;
  active?: boolean;
  /** Minimum stock threshold in grams that triggers a low-stock alert. */
  minStockGrams?: number;
  /** Returned only when the endpoint includes stock data (admin / catalog with stock). */
  currentStockMl?: number;
  /** Average star rating (1–5). */
  rating?: number;
  /** Number of reviews contributing to the rating. */
  reviewCount?: number;
  /** Olfactive family tags (many-to-many, additional families besides the primary one). */
  olfactiveTags?: { id: string; name: string }[];
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

/** Sellable product — now supports lotions, creams, etc. via productType. */
export interface Product {
  id: string;
  name: string;
  description?: string;
  /** Product classification for the updated catalog (lotions, creams, splashes, etc.). */
  productType: 'LOTION' | 'CREAM' | 'SHAMPOO' | 'MAKEUP' | 'SPLASH' | 'ACCESSORY' | 'ESSENCE_CATALOG';
  /** Legacy category kept for backwards compatibility with existing pages. */
  category: 'PERFUME' | 'ACCESSORY' | 'GENERAL';
  /** Only present when productType links to an essence. */
  essenceId?: string;
  essence?: Essence;
  /** Only present when the product ships in a specific bottle. */
  bottle?: Bottle;
  /** Milliliters of product in the container. */
  mlQuantity?: number;
  /** Final selling price in COP. */
  price: number;
  active: boolean;
  /** Available units in warehouse. */
  stockUnits: number;
  photoUrl?: string;
  /** When true, purchasing this product earns the customer 1 gram. Shows "Gana 1g" badge on card. */
  generatesGram: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single line in the shopping cart.
 * Now product-based (lotions, creams, etc.) — no more oz/ml/bottle selection.
 */
export interface CartItem {
  productId: string;
  name: string;
  /** Product classification — used for display grouping and gram preview. */
  productType: Product['productType'];
  /** Units of this product in the cart. */
  quantity: number;
  /** Price per unit in COP. */
  unitPrice: number;
  /** Line total = quantity * unitPrice. */
  lineTotal: number;
  photoUrl?: string;
  /** When true, each unit earns 1g — used to show gram preview in cart summary. */
  generatesGram: boolean;
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

/** Status-history entry for an order (GET /api/orders/:id/history). */
export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: Order['status'];
  notes?: string;
  createdAt: string; // ISO 8601
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

// ─────────────────────────────────────────────────────────────────────────────
// POS (Point of Sale) TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Payload for POST /api/pos/sales — register a new in-store sale. */
export interface POSSaleInput {
  products: { productId: string; quantity: number }[];
  paymentMethod: 'CASH' | 'NEQUI' | 'DAVIPLATA' | 'BANCOLOMBIA' | 'TRANSFERENCIA';
  userId?: string;
  walkInClientName?: string;
  walkInClientEmail?: string;
  walkInClientPhone?: string;
  notes?: string;
  discount?: number;
}

/** Simple invoice data returned after a POS sale. */
export interface SimpleInvoiceData {
  invoiceNumber: string;
  businessName: string;
  businessAddress: string;
  clientName: string;
  clientEmail?: string;
  orderNumber: string;
  date: string;
  time: string;
  timezone: string;
  city: string;
  saleChannel: 'ECOMMERCE' | 'IN_STORE';
  items: { productName: string; quantity: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  notes?: string;
}

/** Result of POST /api/pos/sales. */
export interface POSSaleResult {
  order: Order;
  invoice: SimpleInvoiceData;
  gramsEarned: number;
  tokenIssued: boolean;
}

/** Revenue summary returned by GET /api/pos/revenue. */
export interface RevenueSummary {
  totalEcommerce: number;
  totalInStore: number;
  totalGeneral: number;
  orderCountEcommerce: number;
  orderCountInStore: number;
  topProductsInStore: { name: string; quantity: number; revenue: number }[];
  topProductsEcommerce: { name: string; quantity: number; revenue: number }[];
}
