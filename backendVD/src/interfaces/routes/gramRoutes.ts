/**
 * Rutas del sistema de gramos.
 * Las rutas de cliente requieren autenticacion JWT.
 * Las rutas de ajuste admin requieren ademas el rol ADMIN.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// GramController - Controlador del sistema de gramos.
import { GramController } from "../controllers/GramController";

// authMiddleware - Protege rutas verificando el JWT en el header.
import { authMiddleware } from "../middleware/authMiddleware";

// roleMiddleware - Restringe acceso a roles especificos (ADMIN).
import { roleMiddleware } from "../middleware/roleMiddleware";

/**
 * Crea y retorna el router de gramos para las rutas del cliente.
 * Se monta en /api/grams en app.ts.
 * @param gramController - Controlador inyectado desde app.ts.
 * GET  /account        - Ver billetera con balance, canRedeem, pendientes e historial.
 * POST /redeem         - Canjear gramos por esencia.
 * GET  /history        - Historial paginado de transacciones.
 */
export const createGramRoutes = (
  gramController: GramController
): Router => {
  const router = Router();

  // Todas las rutas de gramos requieren autenticacion
  router.use(authMiddleware);

  // Billetera del usuario
  router.get("/account", gramController.getMyAccount);

  // Canje de gramos por esencia
  router.post("/redeem", gramController.redeemGrams);

  // Historial paginado: GET /history?page=1&limit=20
  router.get("/history", gramController.getTransactionHistory);

  return router;
};

/**
 * Crea y retorna el router de administracion de gramos.
 * Se monta en /api/admin/grams en app.ts.
 * @param gramController - Controlador inyectado desde app.ts.
 * POST /adjust - Ajuste manual de gramos por administrador.
 */
export const createAdminGramRoutes = (
  gramController: GramController
): Router => {
  const router = Router();

  // Control de acceso: solo ADMIN
  router.use(authMiddleware, roleMiddleware("ADMIN"));

  // Ajuste manual de gramos
  router.post("/adjust", gramController.adminAdjustGrams);

  return router;
};
