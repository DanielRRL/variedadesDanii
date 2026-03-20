/**
 * Rutas de pagos.
 * El webhook es publico (llamado por la pasarela de pago).
 * La consulta de pagos por orden tambien es accesible.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// PaymentController - Controlador de pagos.
import { PaymentController } from "../controllers/PaymentController";

/**
 * Crea y retorna el router de pagos.
 * @param paymentController - Controlador inyectado desde app.ts.
 * POST /webhook - Recibir notificacion de pasarela de pago (publico).
 * GET /order/:orderId - Consultar pagos de una orden.
 */
export const createPaymentRoutes = (
  paymentController: PaymentController
): Router => {
  const router = Router();

  // Webhook publico: la pasarela de pago envia notificaciones aqui
  router.post("/webhook", paymentController.webhook);

  // Consultar pagos asociados a una orden
  router.get("/order/:orderId", paymentController.getByOrder);

  return router;
};
