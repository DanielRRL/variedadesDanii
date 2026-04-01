/**
 * api.ts — Axios client for the Variedades DANII backend.
 *
 * Responsibilities:
 *  - Creates a single Axios instance pointing to VITE_API_URL.
 *  - Request interceptor: injects the Bearer token from Zustand authStore.
 *  - Response interceptor: on 401 clears auth state and redirects to /login.
 *  - Exports one typed function per backend endpoint (see groups below).
 *
 * All functions return the Axios promise; callers can await .data directly
 * or let React Query handle loading/error states.
 */

import axios from 'axios';
import type {
  RegisterData,
  EssenceFilters,
  CreateOrderInput,
  PaymentInitInput,
  BottleReturnInput,
  Product,
  WeeklyChallenge,
} from '../types';
import { useToastStore } from '../stores/toastStore';

// ─────────────────────────────────────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Singleton Axios instance.
 * Base URL is injected by Vite from the .env file (VITE_API_URL).
 * If the env var is missing, falls back to the Docker Compose service URL.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ─────────────────────────────────────────────────────────────────────────────
// Interceptors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * REQUEST interceptor — injects Authorization header.
 *
 * The token is read lazily from localStorage on every request so that a
 * token set after the module was first imported is always picked up.
 * We read directly from localStorage (not from the Zustand store) to avoid
 * a circular import with authStore.ts (which imports from this file).
 */
api.interceptors.request.use((config) => {
  // 'danii_auth' is the localStorage key used by authStore (zustand persist).
  const raw = localStorage.getItem('danii_auth');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { state?: { token?: string } };
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Malformed JSON in localStorage — ignore silently.
    }
  }
  return config;
});

/**
 * RESPONSE interceptor — two responsibilities:
 *
 * 1. SUCCESS: Unwraps the backend's standard { success, data } envelope so
 *    callers can access `res.data.user` instead of `res.data.data.user`.
 *
 * 2. ERROR (401): Clears persisted auth and redirects to /login when a
 *    protected endpoint rejects the token (expired / invalid).
 *    Auth endpoints (/api/auth/*) are excluded because a 401 there means
 *    wrong credentials, not an expired session.
 */
api.interceptors.response.use(
  (response) => {
    // Unwrap { success: true, data: { ... } } -> data becomes the inner object
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Ignore 401 from auth endpoints (login, register, etc.) — those are
      // credential errors, not session expiration.
      const url = error.config?.url ?? '';
      if (!url.includes('/api/auth/')) {
        localStorage.removeItem('danii_auth');
        if (!window.location.pathname.startsWith('/login')) {
          useToastStore.getState().addToast('Sesion expirada. Inicia sesion nuevamente.', 'warning');
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTH endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Login with email and password.
 * POST /api/auth/login
 * Returns: { user: User, token: string }
 */
export const login = (email: string, password: string) =>
  api.post('/api/auth/login', { email, password });

/**
 * Register a new CLIENT account.
 * POST /api/auth/register
 * Returns: { message: string }
 */
export const register = (data: RegisterData) =>
  api.post('/api/auth/register', data);

/**
 * Verify email address using the token from the verification email link.
 * POST /api/auth/verify-email
 * Returns: { message: string }
 */
export const verifyEmail = (token: string) =>
  api.post('/api/auth/verify-email', { token });

/**
 * Request a password reset email.
 * POST /api/auth/forgot-password
 * Always returns 200 (anti-enumeration: same response whether email exists or not).
 */
export const forgotPassword = (email: string) =>
  api.post('/api/auth/forgot-password', { email });

/**
 * Reset password using the token from the reset email.
 * POST /api/auth/reset-password
 */
export const resetPassword = (token: string, newPassword: string, confirmPassword: string) =>
  api.post('/api/auth/reset-password', { token, newPassword, confirmPassword });

/**
 * Resend the email verification link to the authenticated user's email.
 * POST /api/auth/resend-verification
 * Returns: { message: string }
 */
export const resendVerification = () =>
  api.post('/api/auth/resend-verification');

/**
 * Update the authenticated user's own profile (name + phone).
 * PUT /api/users/:id
 * Returns: { user: User }
 * Note: Email change is not allowed self-service to prevent account takeover.
 */
export const updateMyProfile = (userId: string, data: { name: string; phone: string }) =>
  api.put(`/api/users/${userId}`, data);

// ─────────────────────────────────────────────────────────────────────────────
// ESSENCES CATALOG endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all active bottles (used in the EssenceDetailPage bottle selector).
 * GET /api/bottles
 * Returns: { success: true, data: Bottle[] }
 * Note: The backend Bottle model does not expose a price field — prices are
 * resolved on the Product table. The frontend uses hardcoded fallback prices
 * (STANDARD: 8,000 COP | LUXURY: 15,000 COP) until the API is extended.
 */
export const getBottles = () =>
  api.get('/api/bottles');

/**
 * Fetch the paginated, filterable list of active essences.
 * GET /api/essences
 * Supports: search, olfactiveFamily, inspirationBrand, minPrice, maxPrice, orderBy, page, limit
 */
export const getEssences = (params?: EssenceFilters) =>
  api.get('/api/essences', { params });

/**
 * Fetch all olfactive families for filter chips.
 * GET /api/essences/families
 * Returns: { success: true, data: { id: string; name: string }[] }
 */
export const getOlfactiveFamilies = () =>
  api.get('/api/essences/families');

/**
 * Fetch a single essence by its UUID, including stock data.
 * GET /api/essences/:id
 */
export const getEssenceById = (id: string) =>
  api.get(`/api/essences/${id}`);

/**
 * Create a new essence (ADMIN).
 * POST /api/essences
 */
export const createEssence = (data: {
  name: string;
  description?: string;
  olfactiveFamilyId: string;
  inspirationBrand?: string;
  houseId?: string;
  pricePerMl?: number;
  tagIds?: string[];
}) => api.post('/api/essences', data);

/**
 * Update an existing essence (ADMIN).
 * PUT /api/essences/:id
 */
export const updateEssence = (id: string, data: Record<string, unknown>) =>
  api.put(`/api/essences/${id}`, data);

/**
 * Delete an essence (ADMIN).
 * DELETE /api/essences/:id
 */
export const deleteEssence = (id: string) =>
  api.delete(`/api/essences/${id}`);

/**
 * Fetch all houses (brands).
 * GET /api/essences/houses
 */
export const getHouses = () =>
  api.get('/api/essences/houses');

/**
 * Create a new house/brand (ADMIN).
 * POST /api/essences/houses
 */
export const createHouse = (data: { name: string; handle: string; description?: string }) =>
  api.post('/api/essences/houses', data);

/**
 * Create a new olfactive family (ADMIN).
 * POST /api/essences/families
 */
export const createOlfactiveFamily = (name: string) =>
  api.post('/api/essences/families', { name });

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS endpoints (public catalog)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all active products (lotions, creams, shampoos, etc.).
 * GET /api/products
 * Returns: Product[]
 */
export const getProducts = () =>
  api.get('/api/products');

/**
 * Fetch a single product by UUID with relations.
 * GET /api/products/:id
 */
export const getProductById = (id: string) =>
  api.get(`/api/products/${id}`);

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new order for the authenticated CLIENT.
 * POST /api/orders
 * Returns: { order: Order }
 */
export const createOrder = (data: CreateOrderInput) =>
  api.post('/api/orders', data);

/**
 * List all orders belonging to the authenticated user.
 * GET /api/orders
 * Returns: { orders: Order[] }
 */
export const getMyOrders = () =>
  api.get('/api/orders');

/**
 * Fetch a single order by its UUID.
 * GET /api/orders/:id
 * Returns: { order: Order }
 */
export const getOrderById = (id: string) =>
  api.get(`/api/orders/${id}`);

/**
 * Fetch status-change history for a single order.
 * GET /api/orders/:id/history
 * Returns: { history: OrderStatusHistory[] }
 */
export const getOrderHistory = (id: string) =>
  api.get(`/api/orders/${id}/history`);

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS endpoints (Wompi)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initiate a Wompi payment for an existing order.
 * POST /api/payments/initiate
 * Returns: { paymentUrl: string } — redirect the customer to this URL.
 */
export const initiatePayment = (data: PaymentInitInput) =>
  api.post('/api/payments/initiate', data);

// ─────────────────────────────────────────────────────────────────────────────
// LOYALTY endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current authenticated user's loyalty account (level, points, discount).
 * GET /api/loyalty/account
 * Returns: { account: LoyaltyAccount }
 */
export const getLoyaltyAccount = () =>
  api.get('/api/loyalty/account');

/**
 * Get paginated loyalty transaction history for the authenticated user.
 * GET /api/loyalty/transactions?page=1
 * Returns: { transactions: LoyaltyTransaction[], total: number }
 */
export const getLoyaltyTransactions = (page?: number) =>
  api.get('/api/loyalty/transactions', { params: { page } });

/**
 * Get the authenticated user's personal referral code.
 * GET /api/loyalty/referral-code
 * Returns: { code: string, usages: number }
 */
export const getMyReferralCode = () =>
  api.get('/api/loyalty/referral-code');

/**
 * Apply another user's referral code (validate at registration).
 * POST /api/loyalty/apply-referral
 * Body: { code: string }
 */
export const applyReferral = (code: string) =>
  api.post('/api/loyalty/apply-referral', { code });

/**
 * Redeem loyalty points to get a discount on a specific order.
 * POST /api/loyalty/redeem
 * Returns: { discountApplied: number, remainingPoints: number }
 */
export const redeemPoints = (points: number, orderId: string) =>
  api.post('/api/loyalty/redeem', { points, orderId });

// ─────────────────────────────────────────────────────────────────────────────
// BOTTLE RETURNS endpoint
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a bottle return to credit loyalty points.
 * POST /api/returns
 * Returns: { pointsEarned: number }
 */
export const createBottleReturn = (data: BottleReturnInput) =>
  api.post('/api/returns', data);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Dashboard + Reports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard
 * Returns all KPIs: salesToday, salesGoal, ordersToday, averageTicket,
 *   newClientsToday, topEssences, recentOrders, lowStockEssences.
 */
export const getDashboardStats = () =>
  api.get('/api/admin/dashboard');

/**
 * GET /api/admin/reports/daily-sales?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns: { labels: string[], values: number[] }
 */
export const getDailySales = (params?: { from?: string; to?: string; period?: string }) =>
  api.get('/api/admin/reports/daily-sales', { params });

/**
 * GET /api/admin/reports/low-stock?threshold=N
 * Returns essences with currentStockMl below threshold.
 */
export const getLowStockAlerts = (threshold?: number) =>
  api.get('/api/admin/reports/low-stock', { params: threshold ? { threshold } : undefined });

/**
 * GET /api/admin/reports/top-products?limit=N
 */
export const getTopProducts = (limit = 5) =>
  api.get('/api/admin/reports/top-products', { params: { limit } });

/**
 * GET /api/admin/reports/sales/csv
 * Returns a Blob (CSV file for download).
 */
export const downloadSalesCSV = (params?: { from?: string; to?: string }) =>
  api.get('/api/admin/reports/sales/csv', { params, responseType: 'blob' });

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Orders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/orders (admin view — all orders, not just own)
 * Params: status, search, page, limit
 */
export const getAdminOrders = (params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => api.get('/api/orders', { params });

/**
 * PATCH /api/orders/:id/status
 * Body: { status: OrderStatus, notes?: string }
 */
export const updateOrderStatus = (id: string, status: string, notes?: string) =>
  api.patch(`/api/orders/${id}/status`, { status, ...(notes ? { notes } : {}) });

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Inventory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/inventory/essence/:essenceId/movements
 * Body: { type: 'IN'|'OUT', ml: number, reason: string, notes?: string }
 * Note: 1 oz = 29.5735 ml. Backend InventoryService handles ml↔grams (1g ≈ 1ml for essences).
 */
export const registerEssenceMovement = (
  essenceId: string,
  data: { type: 'IN' | 'OUT'; ml: number; reason: string; notes?: string },
) => api.post(`/api/inventory/essence/${essenceId}/movements`, data);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Loyalty
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/loyalty/adjust
 * Body: { userId, points (positive=add, negative=deduct), reason }
 */
export const adminAdjustPoints = (data: { userId: string; points: number; reason: string }) =>
  api.post('/api/admin/loyalty/adjust', data);

/**
 * GET /api/users (admin only — searchable list of all users)
 */
export const searchUsers = (params?: { search?: string; page?: number }) =>
  api.get('/api/users', { params });

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Invoices
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/invoices?status=DRAFT|SENT|ACCEPTED|REJECTED&page=1
 * Returns: { invoices: AdminInvoice[], total: number }
 */
export const getAdminInvoices = (params?: { status?: string; page?: number }) =>
  api.get('/api/admin/invoices', { params });

/**
 * POST /api/admin/invoices/:orderId/retry
 * Retries DIAN invoice submission for a DRAFT invoice.
 * DRAFT invoices are ones where DIAN stub returned success but real
 * integration is pending. Admin can manually retry when DIAN real
 * integration is complete (see docs/DIAN_INTEGRATION.md).
 */
export const retryInvoice = (orderId: string) =>
  api.post(`/api/admin/invoices/${orderId}/retry`);

// ─────────────────────────────────────────────────────────────────────────────
// GRAMS endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the authenticated user's gram account (balance, canRedeem, pending redemptions).
 * GET /api/grams/account
 * Returns: { account: GramAccount, canRedeem, pendingRedemptions, history }
 */
export const getMyGramAccount = () =>
  api.get('/api/grams/account');

/**
 * Redeem grams for an essence (13g = 1 oz).
 * POST /api/grams/redeem
 * Body: { gramsToRedeem, essenceName, essenceId? }
 */
export const redeemGrams = (data: { gramsToRedeem: number; essenceName: string; essenceId?: string }) =>
  api.post('/api/grams/redeem', data);

/**
 * Get paginated gram transaction history.
 * GET /api/grams/history?page=1&limit=20
 */
export const getGramHistory = (page = 1) =>
  api.get('/api/grams/history', { params: { page, limit: 20 } });

// ─────────────────────────────────────────────────────────────────────────────
// GAME TOKENS endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the authenticated user's pending game tokens.
 * GET /api/game-tokens/my
 * Returns: { pendingTokens: GameToken[], pendingCount: number }
 */
export const getMyGameTokens = () =>
  api.get('/api/game-tokens/my');

/**
 * Play a game with a pending token (roulette or puzzle).
 * POST /api/game-tokens/:tokenId/play
 * Body: { gameType: 'ROULETTE' | 'PUZZLE' }
 * Returns: { gramsWon, newGramBalance, ozCompleted, message }
 */
export const playGame = (tokenId: string, gameType: 'ROULETTE' | 'PUZZLE') =>
  api.post(`/api/game-tokens/${tokenId}/play`, { gameType });

// ─────────────────────────────────────────────────────────────────────────────
// ESSENCE REDEMPTIONS endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all redemptions for the authenticated user.
 * GET /api/redemptions/my
 * Returns: { redemptions: EssenceRedemption[] }
 */
export const getMyRedemptions = () =>
  api.get('/api/redemptions/my');

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGES endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current weekly challenge. Public — optional auth adds user progress.
 * GET /api/challenges/current
 * Returns: { challenge: WeeklyChallenge | null }
 */
export const getCurrentChallenge = () =>
  api.get('/api/challenges/current');

/**
 * Get the authenticated user's progress on the current weekly challenge.
 * GET /api/challenges/my-progress
 * Returns: { progress: { purchasesCount, completed }, challenge }
 */
export const getMyChallengeProgress = () =>
  api.get('/api/challenges/my-progress');

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Products CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/products?page&type&active
 * Paginated product list with filters for admin panel.
 */
export const adminGetProducts = (params?: { page?: number; type?: string; active?: boolean }) =>
  api.get('/api/admin/products', { params });

/**
 * POST /api/admin/products
 * Create a new product. Accepts FormData (for photo upload) or JSON.
 */
export const adminCreateProduct = (data: FormData | Record<string, unknown>) =>
  api.post('/api/admin/products', data);

/**
 * PUT /api/admin/products/:id
 * Partial update of a product.
 */
export const adminUpdateProduct = (id: string, data: Partial<Product>) =>
  api.put(`/api/admin/products/${id}`, data);

/**
 * PATCH /api/admin/products/:id/toggle
 * Toggle active/inactive state of a product.
 */
export const adminToggleProduct = (id: string) =>
  api.patch(`/api/admin/products/${id}/toggle`);

/**
 * POST /api/admin/products/:id/stock
 * Add stock units to a product with optional notes.
 */
export const adminAddProductStock = (id: string, quantity: number, notes?: string) =>
  api.post(`/api/admin/products/${id}/stock`, { quantity, notes });

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Gamification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/gamification/stats
 * Aggregate gamification stats: tokens issued, grams earned/redeemed, top players.
 */
export const getGamificationStats = () =>
  api.get('/api/admin/gamification/stats');

/**
 * GET /api/admin/redemptions?page&limit
 * Paginated list of pending essence redemptions for admin fulfillment.
 */
export const adminGetPendingRedemptions = (page = 1) =>
  api.get('/api/admin/redemptions', { params: { page, limit: 20 } });

/**
 * PATCH /api/admin/redemptions/:id/deliver
 * Mark a redemption as delivered with optional notes.
 */
export const adminMarkRedemptionDelivered = (id: string, notes?: string) =>
  api.patch(`/api/admin/redemptions/${id}/deliver`, { notes });

/**
 * POST /api/admin/grams/adjust
 * Admin manual adjustment of a user's gram balance.
 */
export const adminAdjustGrams = (data: { userId: string; delta: number; reason: string }) =>
  api.post('/api/admin/grams/adjust', data);

/**
 * POST /api/admin/challenges
 * Create a new weekly challenge.
 */
export const adminCreateChallenge = (data: Omit<WeeklyChallenge, 'id' | 'active' | 'myProgress'>) =>
  api.post('/api/admin/challenges', data);

/**
 * GET /api/admin/clients/:userId/history
 * Full client history: orders, gram account, redemptions, game tokens.
 */
export const getClientHistory = (userId: string) =>
  api.get(`/api/admin/clients/${userId}/history`);

/**
 * GET /api/admin/reports/sales-by-type?from&to
 * Sales grouped by product type within a date range.
 */
export const getSalesByProductType = (params?: { from?: string; to?: string }) =>
  api.get('/api/admin/reports/sales-by-type', { params });
