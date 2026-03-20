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
