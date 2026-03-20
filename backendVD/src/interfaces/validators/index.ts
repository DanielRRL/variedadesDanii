/**
 * Barrel export de todos los validadores.
 * Se importan desde las rutas para aplicar antes de los controladores.
 */
export { registerValidator, loginValidator } from "./authValidator";
export { createProductValidator } from "./productValidator";
export { createOrderValidator, updateOrderStatusValidator } from "./orderValidator";
export {
  essenceMovementValidator,
  bottleMovementValidator,
  productMovementValidator,
  auditValidator,
} from "./inventoryValidator";
export { dailySalesValidator } from "./adminValidator";
export { validate } from "./validate";
