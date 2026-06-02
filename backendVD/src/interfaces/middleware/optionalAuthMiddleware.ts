/**
 * Middleware de autenticacion opcional.
 * Intenta verificar un JWT presente en el header Authorization.
 * Si el token es valido, inyecta userId y userRole en el request.
 * Si no hay token o es invalido, continua sin error (anonimo).
 *
 * Uso tipico: endpoints publicos que se comportan distinto si el
 * usuario esta autenticado (ej: incluir progreso personal).
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// jwt - Para verificar el token si existe.
import jwt from "jsonwebtoken";

// env - Para obtener el JWT secret.
import { env } from "../../config/env";

export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const token = header.slice(7);
      const payload = jwt.verify(token, env.jwt.secret) as { userId: string; role: string };
      req.userId = payload.userId;
      req.userRole = payload.role as "ADMIN" | "CLIENT" | "SELLER" | "DELIVERY";
    } catch {
      // Token invalido: se ignora, sigue como anonimo
    }
  }
  next();
};
