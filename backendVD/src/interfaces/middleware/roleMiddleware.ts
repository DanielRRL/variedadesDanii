/**
 * Middleware de autorizacion por roles.
 * Verifica que el rol del usuario (adjuntado por authMiddleware)
 * este en la lista de roles permitidos.
 * Ejemplo: roleMiddleware("ADMIN") solo deja pasar admins.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// AppError - Para lanzar 401 (sin auth) o 403 (sin permiso).
import { AppError } from "../../utils/AppError";

/**
 * Retorna un middleware que solo deja pasar usuarios con roles permitidos.
 * @param allowedRoles - Roles que pueden acceder (ej: "ADMIN", "CLIENT").
 */
export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole = (req as any).userRole;

    // Si no tiene rol, falta autenticacion
    if (!userRole) {
      next(AppError.unauthorized("Authentication required"));
      return;
    }

    // Verificar si el rol esta en la lista permitida
    if (!allowedRoles.includes(userRole)) {
      next(AppError.forbidden("Insufficient permissions"));
      return;
    }

    next();
  };
};
