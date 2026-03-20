/**
 * Middleware de autenticacion JWT.
 * Extrae el token Bearer del header Authorization,
 * lo verifica con el secret, y adjunta userId y userRole al request.
 * Si el token es invalido o no existe, lanza 401.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// jwt - Para verificar y decodificar el token JWT.
import jwt from "jsonwebtoken";

// env - Variables de entorno con jwt.secret.
import { env } from "../../config/env";

// AppError - Para lanzar errores 401.
import { AppError } from "../../utils/AppError";

/** Estructura del payload dentro del JWT. */
export interface JwtPayload {
  userId: string;
  role: string;
}

/**
 * Middleware que protege rutas verificando el JWT.
 * Agrega req.userId y req.userRole para uso en controladores.
 */
export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    // Extraer header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw AppError.unauthorized("Access token required");
    }

    // Extraer y verificar token
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;

    // Adjuntar datos del usuario al request
    (req as any).userId = decoded.userId;
    (req as any).userRole = decoded.role;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    // jwt.verify lanza error si token invalido o expirado
    next(AppError.unauthorized("Invalid or expired token"));
  }
};
