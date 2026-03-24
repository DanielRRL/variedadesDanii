/**
 * Rutas de gestion de esencias.
 * GET publicos (listar, ver detalle).
 * POST/PUT/DELETE solo para ADMIN.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// EssenceController - Controlador CRUD de esencias.
import { EssenceController } from "../controllers/EssenceController";

// authMiddleware - Protege rutas verificando JWT.
import { authMiddleware } from "../middleware/authMiddleware";

// roleMiddleware - Restringe acceso por rol.
import { roleMiddleware } from "../middleware/roleMiddleware";

/**
 * Crea y retorna el router de esencias.
 * @param essenceController - Controlador inyectado desde app.ts.
 * GET / - Listar todas (publico).
 * GET /:id - Ver detalle (publico).
 * POST / - Crear (solo ADMIN).
 * PUT /:id - Actualizar (solo ADMIN).
 * DELETE /:id - Eliminar (solo ADMIN).
 */
export const createEssenceRoutes = (
  essenceController: EssenceController
): Router => {
  const router = Router();

  // Rutas publicas: cualquiera puede ver esencias
  router.get("/", essenceController.getAll);
  // /families MUST be registered before /:id to avoid being captured as an id param.
  router.get("/families", essenceController.getFamilies);
  router.get("/:id", essenceController.getById);

  // A partir de aqui, se requiere autenticacion
  router.use(authMiddleware);
  // Solo ADMIN puede crear, editar y eliminar esencias
  router.post("/", roleMiddleware("ADMIN"), essenceController.create);
  router.put("/:id", roleMiddleware("ADMIN"), essenceController.update);
  router.delete("/:id", roleMiddleware("ADMIN"), essenceController.delete);

  return router;
};
