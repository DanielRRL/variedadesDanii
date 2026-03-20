/**
 * Barrel export de middlewares.
 * authMiddleware protege rutas, roleMiddleware verifica roles,
 * errorHandler captura errores globalmente.
 */
export { authMiddleware } from "./authMiddleware";
export { roleMiddleware } from "./roleMiddleware";
export { errorHandler } from "./errorHandler";
