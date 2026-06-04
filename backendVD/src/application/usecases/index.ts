/**
 * Barrel export de los casos de uso de la aplicacion.
 * Los casos de uso orquestan servicios y repositorios para cumplir un flujo de negocio.
 */

// CreateOrderUseCase - Flujo completo de creacion de orden.
export { CreateOrderUseCase } from "./CreateOrderUseCase";
export type { CreateOrderInput } from "./CreateOrderUseCase";

// EarnGramAfterOrderUseCase - Acumular gramos tras entrega de pedido.
export { EarnGramAfterOrderUseCase } from "./EarnGramAfterOrderUseCase";
