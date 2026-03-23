/**
 * Rutas de gestion de ordenes de compra.
 * Todas requieren autenticacion JWT.
 * Listar todas y cambiar estado solo para ADMIN/SELLER.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// OrderController - Controlador de ordenes.
import { OrderController } from "../controllers/OrderController";

// authMiddleware - Protege rutas verificando JWT.
import { authMiddleware } from "../middleware/authMiddleware";

// roleMiddleware - Restringe acceso por rol.
import { roleMiddleware } from "../middleware/roleMiddleware";

// Validadores de ordenes: creacion y actualizacion de estado.
import {
  createOrderValidator,
  updateOrderStatusValidator,
} from "../validators/orderValidator";

// validate - Middleware que revisa errores de express-validator.
import { validate } from "../validators/validate";

/**
 * Crea y retorna el router de ordenes.
 * @param orderController - Controlador inyectado desde app.ts.
 * POST / - Crear orden (autenticado, con validacion).
 * GET / - Listar todas (ADMIN/SELLER).
 * GET /my-orders - Ordenes del usuario actual.
 * GET /:id - Detalle de una orden.
 * GET /user/:userId - Ordenes de un usuario (ADMIN).
 * GET /:id/history - Historial de estados de una orden (dueno o ADMIN).
 * PATCH /:id/status - Cambiar estado (ADMIN/SELLER).
 */
export const createOrderRoutes = (
  orderController: OrderController
): Router => {
  const router = Router();

  // Todas las rutas de ordenes requieren autenticacion
  router.use(authMiddleware);

  // Crear orden: validar campos -> revisar errores -> crear
  router.post(
    "/",
    createOrderValidator,
    validate,
    orderController.create
  );

  // Listar todas: solo ADMIN o SELLER
  router.get("/", roleMiddleware("ADMIN", "SELLER"), orderController.getAll);
  // Mis ordenes: usuario autenticado ve sus propias ordenes
  router.get("/my-orders", orderController.getByUser);
  // Detalle de una orden por ID
  router.get("/:id", orderController.getById);
  // Ordenes de un usuario especifico: solo ADMIN
  router.get("/user/:userId", roleMiddleware("ADMIN"), orderController.getByUser);

  // Cambiar estado de orden: solo ADMIN/SELLER con validacion
  router.patch(
    "/:id/status",
    roleMiddleware("ADMIN", "SELLER"),
    updateOrderStatusValidator,
    validate,
    orderController.updateStatus
  );

  // Historial de estados: accesible por el dueno del pedido o ADMIN.
  // La verificacion de propiedad se hace en el controlador (no en el middleware)
  // porque requiere consultar la BD para obtener el userId del pedido.
  router.get("/:id/history", orderController.getOrderHistory);

  return router;
};
