/**
 * Middleware global de manejo de errores.
 * Express requiere 4 parametros (err, req, res, next) para reconocerlo.
 * Si el error es AppError, responde con su statusCode y mensaje.
 * Si es un error inesperado, responde 500 y lo registra en el log.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// AppError - Para distinguir errores controlados de inesperados.
import { AppError } from "../../utils/AppError";

// logger - Para registrar errores no controlados.
import logger from "../../utils/logger";

/**
 * Error handler central de la aplicacion.
 * Se registra al final de la cadena de middlewares en app.ts.
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Error controlado (AppError): responder con status y mensaje especificos
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Error inesperado: loguear y responder 500
  logger.error("Unhandled error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
