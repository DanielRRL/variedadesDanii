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

// prisma - Para verificar que el usuario existe en BD.
import prisma from "../../config/database";

/** Estructura del payload dentro del JWT. */
export interface JwtPayload {
  userId: string;
  role: string;
}

/**
 * Middleware que protege rutas verificando el JWT.
 * Agrega req.userId y req.userRole para uso en controladores.
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extraer header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw AppError.unauthorized("Access token required");
    }

    // Extraer y verificar token
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;

    // Verificar que el usuario aun existe en la BD.
    // Si la BD fue recreada o el usuario fue eliminado, el JWT
    // puede ser valido pero el userId ya no existe, causando FK
    // violations en ordenes, gramos, lealtad, etc.
    const userExists = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true },
    });
    if (!userExists) {
      throw AppError.unauthorized(
        "Sesión inválida. Cierra sesión y vuelve a iniciar."
      );
    }

    // Adjuntar datos del usuario al request
    req.userId = decoded.userId;
    req.userRole = decoded.role as "ADMIN" | "CLIENT" | "SELLER" | "DELIVERY";

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
