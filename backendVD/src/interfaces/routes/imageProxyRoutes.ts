/**
 * Rutas de proxy de imagenes.
 * GET /api/images/proxy?url=<encoded_url>
 *
 * Ruta publica — no requiere autenticacion porque las imagenes
 * deben mostrarse en el catalogo publico y en el carrito.
 */

import { Router } from "express";
import { ImageProxyController } from "../controllers/ImageProxyController";

export function createImageProxyRoutes(): Router {
  const router = Router();
  const controller = new ImageProxyController();

  router.get("/", controller.proxy);

  return router;
}
