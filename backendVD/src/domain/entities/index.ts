/**
 * Barrel export de entidades de dominio.
 * Centraliza todas las exportaciones de entidades, enums e interfaces
 * para que el resto de la aplicacion importe desde un solo punto.
 */

// Entidad Usuario y sus tipos asociados.
export { User, UserRole } from "./User";
export type { UserProps } from "./User";

// Entidad Esencia y sus tipos asociados.
export { Essence } from "./Essence";
export type { EssenceProps } from "./Essence";

// Entidad Frasco y sus tipos asociados.
export { Bottle, BottleType } from "./Bottle";
export type { BottleProps } from "./Bottle";

// Entidad Producto y sus tipos asociados.
export { Product, ProductCategory } from "./Product";
export type { ProductProps } from "./Product";

// Entidad Pedido y sus tipos asociados.
export { Order, OrderStatus, OrderType, PaymentMethod } from "./Order";
export type { OrderProps, OrderItemData } from "./Order";

// Entidad Movimiento de Esencia y sus tipos asociados.
export { EssenceMovement, MovementType, MovementReason } from "./EssenceMovement";
export type { EssenceMovementProps } from "./EssenceMovement";

// Entidad Movimiento de Frasco y sus tipos asociados.
export { BottleMovement, BottleMovementType, BottleMovementReason } from "./BottleMovement";
export type { BottleMovementProps } from "./BottleMovement";

// Entidad Devolucion de Frasco y sus tipos asociados.
export { BottleReturn } from "./BottleReturn";
export type { BottleReturnProps } from "./BottleReturn";

// Entidad Auditoria de Inventario y sus tipos asociados.
export { InventoryAudit, AuditEntityType } from "./InventoryAudit";
export type { InventoryAuditProps } from "./InventoryAudit";

// Entidades del programa de fidelizacion.
export { LoyaltyAccount, LoyaltyLevel, LoyaltyTxType } from "./LoyaltyAccount";
export type { LoyaltyAccountProps } from "./LoyaltyAccount";
export { LoyaltyTransaction } from "./LoyaltyTransaction";
export type { LoyaltyTransactionProps } from "./LoyaltyTransaction";

// Entidades del programa de referidos.
export { ReferralCode } from "./ReferralCode";
export type { ReferralCodeProps } from "./ReferralCode";
export { ReferralUsage } from "./ReferralUsage";
export type { ReferralUsageProps } from "./ReferralUsage";

// Entidad historial de estados de pedido.
export { OrderStatusHistory } from "./OrderStatusHistory";
export type { OrderStatusHistoryProps } from "./OrderStatusHistory";

// Entidades de autenticacion (tokens de un solo uso).
export { EmailVerification } from "./EmailVerification";
export type { EmailVerificationProps } from "./EmailVerification";
export { PasswordReset } from "./PasswordReset";
export type { PasswordResetProps } from "./PasswordReset";

// Entidad de facturacion electronica DIAN.
export { ElectronicInvoice, InvoiceStatus } from "./ElectronicInvoice";
export type { ElectronicInvoiceProps } from "./ElectronicInvoice";

// Entidades del sistema de gamificacion (gramos).
export { GramAccount, GramSourceType } from "./GramAccount";
export type { GramAccountProps } from "./GramAccount";
export { GramTransaction } from "./GramTransaction";
export type { GramTransactionProps } from "./GramTransaction";
export { GameToken, GameTokenStatus, GameType } from "./GameToken";
export type { GameTokenProps } from "./GameToken";
export { EssenceRedemption, EssenceRedemptionStatus } from "./EssenceRedemption";
export type { EssenceRedemptionProps } from "./EssenceRedemption";
