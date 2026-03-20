/**
 * Rutas de gestion de frascos.
 * GET publicos (listar, ver detalle).
 * POST/PUT/DELETE solo para ADMIN.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// BottleController - Controlador CRUD de frascos.
import { BottleController } from "../controllers/BottleController";

// authMiddleware - Protege rutas verificando JWT.
import { authMiddleware } from "../middleware/authMiddleware";

// roleMiddleware - Restringe acceso por rol.
import { roleMiddleware } from "../middleware/roleMiddleware";

/**
 * Crea y retorna el router de frascos.
 * @param bottleController - Controlador inyectado desde app.ts.
 * GET / - Listar todos (publico).
 * GET /:id - Ver detalle (publico).
 * POST / - Crear (solo ADMIN).
 * PUT /:id - Actualizar (solo ADMIN).
 * DELETE /:id - Eliminar (solo ADMIN).
 */
export const createBottleRoutes = (
  bottleController: BottleController
): Router => {
  const router = Router();

  // Rutas publicas: cualquiera puede ver frascos
  router.get("/", bottleController.getAll);
  router.get("/:id", bottleController.getById);

  // A partir de aqui, se requiere autenticacion
  router.use(authMiddleware);
  // Solo ADMIN puede crear, editar y eliminar frascos
  router.post("/", roleMiddleware("ADMIN"), bottleController.create);
  router.put("/:id", roleMiddleware("ADMIN"), bottleController.update);
  router.delete("/:id", roleMiddleware("ADMIN"), bottleController.delete);

  return router;
};
