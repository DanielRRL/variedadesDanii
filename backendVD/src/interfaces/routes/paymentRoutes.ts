/**
 * Rutas de pagos.
 * Endpoints de consulta de pagos por orden.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// PaymentController - Controlador de pagos.
import { PaymentController } from "../controllers/PaymentController";

// authMiddleware - Protege rutas verificando JWT.
import { authMiddleware } from "../middleware/authMiddleware";

/**
 * Crea y retorna el router de pagos.
 * @param paymentController - Controlador inyectado desde app.ts.
 * GET /order/:orderId - Consultar pagos de una orden (requiere autenticacion).
 */
export const createPaymentRoutes = (
  paymentController: PaymentController
): Router => {
  const router = Router();

  // Todas las rutas requieren autenticacion
  router.use(authMiddleware);

  // Consultar pagos asociados a una orden
  router.get("/order/:orderId", paymentController.getByOrder);

  return router;
};
