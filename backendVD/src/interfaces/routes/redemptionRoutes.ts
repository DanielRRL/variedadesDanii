/**
 * Rutas de canjes de esencia.
 * Rutas de cliente: autenticacion JWT.
 * Rutas de admin: autenticacion JWT + rol ADMIN.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// EssenceRedemptionController - Controlador de canjes de esencia.
import { EssenceRedemptionController } from "../controllers/EssenceRedemptionController";

// authMiddleware - Protege rutas verificando el JWT en el header.
import { authMiddleware } from "../middleware/authMiddleware";

// roleMiddleware - Restringe acceso a roles especificos.
import { roleMiddleware } from "../middleware/roleMiddleware";

/**
 * Crea y retorna el router de canjes para el cliente.
 * Se monta en /api/redemptions en app.ts.
 * @param redemptionController - Controlador inyectado desde app.ts.
 * GET /my - Mis canjes (cliente autenticado).
 */
export const createRedemptionRoutes = (
  redemptionController: EssenceRedemptionController
): Router => {
  const router = Router();

  // Autenticacion requerida
  router.use(authMiddleware);

  // Mis canjes
  router.get("/my", redemptionController.getMyRedemptions);

  return router;
};

/**
 * Crea y retorna el router de administracion de canjes.
 * Se monta en /api/admin/redemptions en app.ts.
 * @param redemptionController - Controlador inyectado desde app.ts.
 * GET   /                - Entregas pendientes paginadas (FIFO).
 * PATCH /:id/deliver     - Marcar como entregado.
 * PATCH /:id/cancel      - Cancelar y devolver gramos.
 */
export const createAdminRedemptionRoutes = (
  redemptionController: EssenceRedemptionController
): Router => {
  const router = Router();

  // Control de acceso: solo ADMIN
  router.use(authMiddleware, roleMiddleware("ADMIN"));

  // Entregas pendientes
  router.get("/", redemptionController.adminGetPendingDeliveries);

  // Marcar como entregado
  router.patch("/:id/deliver", redemptionController.adminMarkDelivered);

  // Cancelar canje
  router.patch("/:id/cancel", redemptionController.adminCancelRedemption);

  return router;
};
