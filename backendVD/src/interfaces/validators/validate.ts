/**
 * Middleware generico de validacion.
 * Se ejecuta despues de los validadores de express-validator.
 * Si hay errores, retorna 400 con la lista de errores.
 * Si no hay errores, pasa al siguiente middleware/controlador.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// validationResult - Recopila errores de los validadores anteriores.
import { validationResult } from "express-validator";

/**
 * Middleware que revisa los resultados de la validacion.
 * Debe ir despues de los arrays de validacion en la cadena de middlewares.
 */
export const validate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Retornar 400 con lista de errores formateada
    res.status(400).json({
      success: false,
      errors: errors.array().map((e) => ({
        field: (e as any).path,
        message: e.msg,
      })),
    });
    return;
  }
  next();
};
