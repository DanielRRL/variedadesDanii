/**
 * Rutas del programa de fidelizacion y codigos de referido.
 * Las rutas de cliente requieren autenticacion JWT.
 * Las rutas de administracion requieren ademas el rol ADMIN.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// LoyaltyController - Controlador que delega a LoyaltyService y ReferralService.
import { LoyaltyController } from "../controllers/LoyaltyController";

// authMiddleware - Protege rutas verificando el JWT en el header.
import { authMiddleware } from "../middleware/authMiddleware";

// roleMiddleware - Restringe acceso a roles especificos (ADMIN).
import { roleMiddleware } from "../middleware/roleMiddleware";

/**
 * Crea y retorna el router de fidelizacion para las rutas del cliente.
 * Se monta en /api/loyalty en app.ts.
 * @param loyaltyController - Controlador inyectado desde app.ts.
 * GET  /account          - Ver resumen de cuenta y transacciones recientes.
 * GET  /transactions     - Historial paginado de movimientos de puntos.
 * POST /redeem           - Canjear puntos como descuento en una orden.
 * GET  /referral-code    - Obtener (o generar) el codigo de referido propio.
 * POST /apply-referral   - Aplicar el codigo de referido de otro usuario.
 */
export const createLoyaltyRoutes = (
  loyaltyController: LoyaltyController
): Router => {
  const router = Router();

  // Todas las rutas de este router requieren autenticacion
  router.use(authMiddleware);

  // Resumen de cuenta con transacciones recientes
  router.get("/account", loyaltyController.getMyAccount);

  // Historial paginado: GET /transactions?page=1&limit=20
  router.get("/transactions", loyaltyController.getMyTransactions);

  // Canjear puntos como descuento en una orden
  router.post("/redeem", loyaltyController.redeemPoints);

  // Ver o generar el codigo de referido del usuario
  router.get("/referral-code", loyaltyController.getMyReferralCode);

  // Aplicar el codigo de referido de otro usuario
  router.post("/apply-referral", loyaltyController.applyReferralCode);

  return router;
};

/**
 * Crea y retorna el router de administracion de fidelizacion.
 * Se monta en /api/admin/loyalty en app.ts.
 * @param loyaltyController - Controlador inyectado desde app.ts.
 * POST /adjust - Ajuste manual de puntos por administrador.
 */
export const createAdminLoyaltyRoutes = (
  loyaltyController: LoyaltyController
): Router => {
  const router = Router();

  // Control de acceso: solo ADMIN puede realizar ajustes manuales
  router.use(authMiddleware, roleMiddleware("ADMIN"));

  // Ajuste manual de puntos (credito o debito)
  router.post("/adjust", loyaltyController.adminAdjustPoints);

  return router;
};
