/**
 * Rutas de gestion de inventario (esencias, frascos y productos generales).
 * Solo accesibles por ADMIN y SELLER.
 * Permite consultar stock, movimientos, registrar entradas/salidas
 * y realizar auditorias de inventario.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// InventoryController - Controlador de inventario.
import { InventoryController } from "../controllers/InventoryController";

// authMiddleware - Protege rutas verificando JWT.
import { authMiddleware } from "../middleware/authMiddleware";

// roleMiddleware - Restringe acceso por rol.
import { roleMiddleware } from "../middleware/roleMiddleware";

// Validadores de movimientos de inventario y auditorias.
import {
  essenceMovementValidator,
  bottleMovementValidator,
  productMovementValidator,
  auditValidator,
} from "../validators/inventoryValidator";

// validate - Middleware que revisa errores de express-validator.
import { validate } from "../validators/validate";

/**
 * Crea y retorna el router de inventario.
 * @param inventoryController - Controlador inyectado desde app.ts.
 *
 * Esencias:
 *   GET /essence/:essenceId/stock
 *   GET /essence/:essenceId/movements
 *   POST /essence/movement
 *
 * Frascos:
 *   GET /bottle/:bottleId/stock
 *   GET /bottle/:bottleId/movements
 *   POST /bottle/movement
 *
 * Productos generales:
 *   GET /product/:productId/stock
 *   GET /product/:productId/movements
 *   POST /product/movement
 *
 * Auditorias:
 *   POST /audit
 *   GET /audit/:entityType
 *   GET /audit/entity/:entityId
 */
export const createInventoryRoutes = (
  inventoryController: InventoryController
): Router => {
  const router = Router();

  // Todas las rutas requieren autenticacion y rol ADMIN/SELLER
  router.use(authMiddleware);
  router.use(roleMiddleware("ADMIN", "SELLER"));

  // --- Inventario de esencias ---
  router.get("/essence/:essenceId/stock", inventoryController.getEssenceStock);
  router.get("/essence/:essenceId/movements", inventoryController.getEssenceMovements);
  router.post(
    "/essence/movement",
    essenceMovementValidator,
    validate,
    inventoryController.createEssenceMovement
  );

  // --- Inventario de frascos ---
  router.get("/bottle/:bottleId/stock", inventoryController.getBottleStock);
  router.get("/bottle/:bottleId/movements", inventoryController.getBottleMovements);
  router.post(
    "/bottle/movement",
    bottleMovementValidator,
    validate,
    inventoryController.createBottleMovement
  );

  // --- Inventario de productos generales (ACCESSORY/GENERAL) ---
  router.get("/product/:productId/stock", inventoryController.getProductStock);
  router.get("/product/:productId/movements", inventoryController.getProductMovements);
  router.post(
    "/product/movement",
    productMovementValidator,
    validate,
    inventoryController.createProductMovement
  );

  // --- Auditorias de inventario ---
  router.post("/audit", auditValidator, validate, inventoryController.createAudit);
  router.get("/audit/:entityType", inventoryController.getAuditsByEntityType);
  router.get("/audit/entity/:entityId", inventoryController.getAuditsByEntityId);

  return router;
};
