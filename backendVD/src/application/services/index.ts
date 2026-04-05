/**
 * Barrel export de todos los servicios de la capa de aplicacion.
 * Exporta clases, enums e interfaces/types necesarios.
 */

// AuthService - Registro, login y generacion de JWT.
export { AuthService } from "./AuthService";
export type { RegisterDTO, LoginDTO, AuthResponse } from "./AuthService";

// InventoryService - Control de stock (entradas/salidas).
export { InventoryService } from "./InventoryService";

// AdminService - Reportes y metricas del panel administrativo.
export { AdminService } from "./AdminService";

// DiscountService - Reglas de descuento del negocio.
export { DiscountService, DiscountType } from "./DiscountService";
export type { DiscountResult } from "./DiscountService";

// PaymentStrategy - Patron Strategy para metodos de pago colombianos.
export {
  PaymentStrategyFactory,
  NequiPayment,
  DaviplataPayment,
  BancolombiaPayment,
  CashPayment,
} from "./PaymentStrategy";
export type { IPaymentStrategy, PaymentResult } from "./PaymentStrategy";

// GramService - Sistema de acumulacion y canje de gramos.
export {
  GramService,
  GRAMS_PER_PURCHASE,
  GRAMS_FOR_ESSENCE_OZ_BONUS,
  GRAMS_PER_OZ,
  MAX_GRAMS,
  MIN_PURCHASES_TO_REDEEM,
  REFERRAL_DISCOUNT_PCT,
} from "./GramService";

// GameTokenService - Fichas de juego (ruleta, puzzle, memoria, raspadita, dados).
export {
  GameTokenService,
  MAX_PENDING_TOKENS,
  TOKEN_EXPIRY_HOURS,
  GAME_CONFIGS,
} from "./GameTokenService";
