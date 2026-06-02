/**
 * Utilidad para extraer parametros de ruta en Express 5.
 * Express 5 cambio la tipificacion de req.params[key] a string | string[],
 * pero en esta aplicacion todos los parametros de ruta son de un solo valor
 * (ej: /:id, /:essenceId), asi que es seguro castear a string.
 */

// Request - Tipo de la peticion HTTP de Express.
// Se importa para tipar el parametro req de la funcion.
import { Request } from "express";

// AppError - Para lanzar 400 si el parametro no existe.
import { AppError } from "./AppError";

/**
 * Extrae un parametro de ruta como string.
 * Express 5 tipa req.params como `string | string[]`.
 * Si el parametro no existe, lanza 400 en vez de retornar undefined.
 * @param req - Objeto de peticion de Express.
 * @param name - Nombre del parametro de ruta (ej: "id", "essenceId").
 * @returns El valor del parametro como string.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (value === undefined) {
    throw AppError.badRequest(`Missing required parameter: ${name}`);
  }
  return value as string;
}
