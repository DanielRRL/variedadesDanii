/**
 * Rutas de gestion de productos.
 * Productos = combinacion de esencia + frasco + ml + precio.
 * GET publicos. POST/PUT/DELETE solo ADMIN con validacion.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// ProductController - Controlador CRUD de productos.
import { ProductController } from "../controllers/ProductController";

// authMiddleware - Protege rutas verificando JWT.
import { authMiddleware } from "../middleware/authMiddleware";

// roleMiddleware - Restringe acceso por rol.
import { roleMiddleware } from "../middleware/roleMiddleware";

// createProductValidator - Validacion de campos del producto.
import { createProductValidator } from "../validators/productValidator";

// validate - Middleware que revisa errores de express-validator.
import { validate } from "../validators/validate";

/**
 * Crea y retorna el router de productos.
 * @param productController - Controlador inyectado desde app.ts.
 * GET / - Listar todos (publico).
 * GET /:id - Ver detalle (publico).
 * POST / - Crear (solo ADMIN, con validacion).
 * PUT /:id - Actualizar (solo ADMIN).
 * DELETE /:id - Eliminar (solo ADMIN).
 */
export const createProductRoutes = (
  productController: ProductController
): Router => {
  const router = Router();

  // Rutas publicas: cualquiera puede ver productos
  router.get("/", productController.getAll);
  router.get("/:id", productController.getById);

  // A partir de aqui, se requiere autenticacion
  router.use(authMiddleware);
  // Crear producto: ADMIN + validar campos + revisar errores
  router.post(
    "/",
    roleMiddleware("ADMIN"),
    createProductValidator,
    validate,
    productController.create
  );
  router.put("/:id", roleMiddleware("ADMIN"), productController.update);
  router.delete("/:id", roleMiddleware("ADMIN"), productController.delete);

  return router;
};

/**
 * Crea y retorna el router de administracion de productos (catalogo gamificado).
 * Se monta en /api/admin/products en app.ts.
 * @param productController - Controlador inyectado desde app.ts.
 * GET    /                - Listar todos con paginacion y filtros.
 * POST   /                - Crear producto.
 * PUT    /:id             - Actualizar producto.
 * PATCH  /:id/toggle      - Activar/desactivar producto.
 * POST   /:id/stock       - Agregar stock (con movimiento).
 */
export const createAdminProductRoutes = (
  productController: ProductController
): Router => {
  const router = Router();

  // Todas requieren auth + ADMIN
  router.use(authMiddleware, roleMiddleware("ADMIN"));

  router.get("/", productController.adminGetAll);
  router.post("/", productController.adminCreate);
  router.put("/:id", productController.adminUpdate);
  router.patch("/:id/toggle", productController.adminToggleActive);
  router.post("/:id/stock", productController.adminAddStock);

  return router;
};
