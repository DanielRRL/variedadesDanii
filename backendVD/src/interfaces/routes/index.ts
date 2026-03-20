/**
 * Barrel export de todas las fabricas de rutas.
 * Cada funcion crea un Router de Express con las rutas de su modulo.
 * Se importan en app.ts para montar en /api/*.
 */
export { createAuthRoutes } from "./authRoutes";
export { createUserRoutes } from "./userRoutes";
export { createEssenceRoutes } from "./essenceRoutes";
export { createBottleRoutes } from "./bottleRoutes";
export { createProductRoutes } from "./productRoutes";
export { createOrderRoutes } from "./orderRoutes";
export { createInventoryRoutes } from "./inventoryRoutes";
export { createBottleReturnRoutes } from "./bottleReturnRoutes";
export { createPaymentRoutes } from "./paymentRoutes";
export { createAdminRoutes } from "./adminRoutes";
