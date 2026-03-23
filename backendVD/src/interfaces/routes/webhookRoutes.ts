/**
 * Rutas de webhooks de pasarelas de pago.
 *
 * CRITICO - Requisito de body RAW:
 * La validacion de la firma HMAC-SHA256 de Wompi requiere el cuerpo del
 * request como bytes sin modificar. Si se usa express.json() antes de esta
 * ruta, Express parsea el JSON y lo reemplaza en req.body, perdiendo el
 * string original. Una diferencia de un solo byte (ej: espacio extra) hace
 * que el hash calculado no coincida con el de Wompi y el webhook sea rechazado.
 *
 * Solucion: usar express.raw({ type: 'application/json' }) unicamente en
 * esta ruta. Express llenara req.body con un Buffer del cuerpo original.
 * El controlador se encarga de parsearlo a JSON DESPUES de validar la firma.
 *
 * Este router se monta en app.ts ANTES del middleware express.json() global
 * para que la ruta del webhook use raw() en lugar del parser JSON.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// express - Para usar el middleware express.raw().
import express from "express";

// PaymentWebhookController - Controlador que valida y procesa los eventos.
import { PaymentWebhookController } from "../controllers/PaymentWebhookController";

/**
 * Crea y retorna el router de webhooks de pago.
 * @param controller - PaymentWebhookController inyectado desde app.ts.
 */
export const createWebhookRoutes = (
  controller: PaymentWebhookController
): Router => {
  const router = Router();

  /**
   * POST /wompi
   * Recibe eventos de Wompi (transaction.updated, etc.).
   *
   * express.raw() captura el body como Buffer sin parsearlo.
   * Solo acepta content-type: application/json (Wompi siempre lo envia asi).
   * El limite de 1mb es mas que suficiente para un payload de evento Wompi.
   */
  router.post(
    "/wompi",
    express.raw({ type: "application/json", limit: "1mb" }),
    controller.handleWompiWebhook
  );

  return router;
};
