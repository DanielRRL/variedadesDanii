/**
 * Rutas de facturas electronicas.
 *
 * createInvoiceRoutes       → /api/invoices
 * createAdminInvoiceRoutes  → /api/admin/invoices
 */

import { Router } from "express";

import { InvoiceController } from "../controllers/InvoiceController";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

/**
 * Rutas publicas de facturas (requieren autenticacion).
 * Montadas en /api/invoices.
 */
export function createInvoiceRoutes(controller: InvoiceController): Router {
  const router = Router();

  // GET /api/invoices/:orderId — Ver factura de una orden.
  router.get("/:orderId", authMiddleware, controller.getByOrder);

  // GET /api/invoices/:orderId/pdf — Descargar PDF (stub 501).
  router.get("/:orderId/pdf", authMiddleware, controller.downloadPdf);

  return router;
}

/**
 * Rutas administrativas de facturas.
 * Montadas en /api/admin/invoices.
 * Todas requieren autenticacion + rol ADMIN.
 */
export function createAdminInvoiceRoutes(controller: InvoiceController): Router {
  const router = Router();

  router.use(authMiddleware, roleMiddleware("ADMIN"));

  // GET /api/admin/invoices?page=1&limit=20&status=DRAFT — Listar facturas.
  router.get("/", controller.listInvoices);

  // POST /api/admin/invoices/:orderId/retry — Reintentar factura DRAFT.
  router.post("/:orderId/retry", controller.retryInvoice);

  return router;
}
