/**
 * Rutas de fichas de juego (minijuegos gamificacion).
 * Todas requieren autenticacion JWT (solo clientes).
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// GameTokenController - Controlador de fichas de juego.
import { GameTokenController } from "../controllers/GameTokenController";

// authMiddleware - Protege rutas verificando el JWT en el header.
import { authMiddleware } from "../middleware/authMiddleware";

/**
 * Crea y retorna el router de fichas de juego.
 * Se monta en /api/game-tokens en app.ts.
 * @param gameTokenController - Controlador inyectado desde app.ts.
 * GET  /my             - Fichas pendientes del usuario.
 * POST /:tokenId/play  - Jugar una ficha (ROULETTE o PUZZLE).
 */
export const createGameTokenRoutes = (
  gameTokenController: GameTokenController
): Router => {
  const router = Router();

  // Todas las rutas requieren autenticacion
  router.use(authMiddleware);

  // Fichas pendientes del usuario
  router.get("/my", gameTokenController.getMyTokens);

  // Jugar una ficha
  router.post("/:tokenId/play", gameTokenController.playGame);

  return router;
};
