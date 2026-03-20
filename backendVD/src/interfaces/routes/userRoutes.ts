/**
 * Rutas de gestion de usuarios.
 * Todas requieren autenticacion JWT.
 * GET / solo para ADMIN (listar todos).
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// UserController - Controlador con operaciones de usuario.
import { UserController } from "../controllers/UserController";

// authMiddleware - Protege las rutas verificando JWT.
import { authMiddleware } from "../middleware/authMiddleware";

// roleMiddleware - Restringe acceso por rol.
import { roleMiddleware } from "../middleware/roleMiddleware";

/**
 * Crea y retorna el router de usuarios.
 * @param userController - Controlador inyectado desde app.ts.
 * GET / - Listar todos (solo ADMIN).
 * GET /:id - Obtener usuario por ID.
 * PUT /:id - Actualizar usuario.
 */
export const createUserRoutes = (userController: UserController): Router => {
  const router = Router();

  // Todas las rutas de usuario requieren estar autenticado
  router.use(authMiddleware);

  // Solo admins pueden listar todos los usuarios
  router.get("/", roleMiddleware("ADMIN"), userController.getAll);
  // Cualquier usuario autenticado puede ver un perfil
  router.get("/:id", userController.getById);
  // Cualquier usuario autenticado puede actualizar su perfil
  router.put("/:id", userController.update);

  return router;
};
