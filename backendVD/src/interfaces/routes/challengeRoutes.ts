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

/**
 * Middleware que intenta autenticar sin rechazar si el token esta ausente.
 * Si hay token valido, setea req.userId y req.userRole.
 * Si no hay token o es invalido, continua sin error.
 */
import jwt from "jsonwebtoken";
import { env } from "../../config/env";

function optionalAuth(req: any, _res: any, next: any): void {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const token = header.slice(7);
      const payload = jwt.verify(token, env.jwt.secret) as any;
      req.userId = payload.userId;
      req.userRole = payload.role;
    } catch {
      // Token invalido: se ignora, sigue como anonimo
    }
  }
  next();
}
