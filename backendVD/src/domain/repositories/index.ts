/**
 * Barrel export de interfaces de repositorios.
 * Centraliza las exportaciones para simplificar imports.
 * Todas son interfaces (contratos), las implementaciones
 * concretas estan en infrastructure/repositories/.
 */

export { IUserRepository } from "./IUserRepository";
export type { CreateUserData } from "./IUserRepository";
export { IEssenceRepository } from "./IEssenceRepository";
export { IBottleRepository } from "./IBottleRepository";
export { IProductRepository } from "./IProductRepository";
export { IOrderRepository } from "./IOrderRepository";
export type { CreateOrderData } from "./IOrderRepository";
export { IInventoryRepository } from "./IInventoryRepository";
export { IPaymentRepository } from "./IPaymentRepository";
export { IBottleReturnRepository } from "./IBottleReturnRepository";
export { IAdminRepository } from "./IAdminRepository";
export type {
  DailySalesResult,
  TopProductResult,
  LowStockEssence,
  DashboardSummary,
} from "./IAdminRepository";
