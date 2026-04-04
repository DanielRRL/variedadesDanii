/**
 * Rutas de ventas presenciales (POS).
 * POST /sales   — Crear venta (ADMIN | SELLER)
 * GET  /sales   — Listar ventas (ADMIN)
 * GET  /sales/:id — Detalle (ADMIN | SELLER)
 * GET  /revenue — Resumen de ingresos (ADMIN)
 */

import { Router } from "express";
import { body } from "express-validator";
import { POSController } from "../controllers/POSController";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";
import { validate } from "../validators/validate";

/** Validadores para crear una venta POS. */
const createPOSSaleValidator = [
  body("products")
    .isArray({ min: 1 })
    .withMessage("Se requiere al menos un producto"),
  body("products.*.productId")
    .notEmpty()
    .isUUID()
    .withMessage("productId debe ser UUID válido"),
  body("products.*.quantity")
    .isInt({ gt: 0 })
    .withMessage("quantity debe ser mayor a 0"),
  body("paymentMethod")
    .isIn(["CASH", "NEQUI", "DAVIPLATA", "BANCOLOMBIA", "TRANSFERENCIA"])
    .withMessage("Método de pago inválido"),
  body("userId")
    .optional()
    .isUUID()
    .withMessage("userId debe ser UUID válido"),
  body("walkInClientName")
    .optional()
    .isString()
    .isLength({ min: 2, max: 200 })
    .withMessage("Nombre del cliente debe tener entre 2 y 200 caracteres"),
  body("walkInClientEmail")
    .optional()
    .isEmail()
    .withMessage("Email inválido"),
  body("discount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Descuento debe ser >= 0"),
];

export const createPOSRoutes = (posController: POSController): Router => {
  const router = Router();

  // Todas las rutas POS requieren autenticacion
  router.use(authMiddleware);

  // POST /sales — Crear venta presencial (ADMIN o SELLER)
  router.post(
    "/sales",
    roleMiddleware("ADMIN", "SELLER"),
    createPOSSaleValidator,
    validate,
    posController.createSale,
  );

  // GET /sales — Listar ventas con filtros (solo ADMIN)
  router.get(
    "/sales",
    roleMiddleware("ADMIN"),
    posController.getSales,
  );

  // GET /sales/:id — Detalle de una venta (ADMIN o SELLER)
  router.get(
    "/sales/:id",
    roleMiddleware("ADMIN", "SELLER"),
    posController.getSaleById,
  );

  // GET /revenue — Resumen de ingresos por canal (solo ADMIN)
  router.get(
    "/revenue",
    roleMiddleware("ADMIN"),
    posController.getRevenueSummary,
  );

  return router;
};
