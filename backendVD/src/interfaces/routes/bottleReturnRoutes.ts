/**
 * Rutas de devolucion de frascos.
 * Todas requieren autenticacion.
 * Permite a clientes registrar y consultar sus devoluciones.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// BottleReturnController - Controlador de devoluciones de frascos.
import { BottleReturnController } from "../controllers/BottleReturnController";

// authMiddleware - Protege rutas verificando JWT.
import { authMiddleware } from "../middleware/authMiddleware";

/**
 * Crea y retorna el router de devoluciones de frascos.
 * @param bottleReturnController - Controlador inyectado desde app.ts.
 * POST / - Registrar devolucion de frasco.
 * GET /my-returns - Ver mis devoluciones.
 */
export const createBottleReturnRoutes = (
  bottleReturnController: BottleReturnController
): Router => {
  const router = Router();

  // Todas las rutas de devolucion requieren autenticacion
  router.use(authMiddleware);

  // Registrar una devolucion de frasco
  router.post("/", bottleReturnController.create);
  // Consultar mis devoluciones
  router.get("/my-returns", bottleReturnController.getByUser);

  return router;
};
