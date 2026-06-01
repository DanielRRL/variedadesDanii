/**
 * Rutas de desafios semanales.
 * GET /current - Publico (opcional auth para incluir progreso).
 * GET /my-progress - Solo clientes autenticados.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// AdminController - Controlador que contiene los metodos de desafios.
import { AdminController } from "../controllers/AdminController";

// authMiddleware - Protege rutas verificando el JWT en el header.
import { authMiddleware } from "../middleware/authMiddleware";

// optionalAuth - Middleware que extrae userId si hay token, pero no rechaza si no.
import { optionalAuth } from "../middleware/optionalAuthMiddleware";

/**
 * Crea y retorna el router de desafios semanales.
 * Se monta en /api/challenges en app.ts.
 * @param adminController - Controlador inyectado desde app.ts.
 * GET /current     - Desafio activo (publico, auth opcional para progreso).
 * GET /my-progress - Mi progreso en el desafio (cliente autenticado).
 */
export const createChallengeRoutes = (
  adminController: AdminController
): Router => {
  const router = Router();

  // Desafio actual: publico. Auth opcional (se intenta extraer userId si hay token).
  // El controlador maneja internamente la presencia/ausencia de userId.
  router.get("/current", optionalAuth, adminController.getCurrentChallenge);

  // Mi progreso: requiere autenticacion
  router.get("/my-progress", authMiddleware, adminController.getMyProgress);

  return router;
};
