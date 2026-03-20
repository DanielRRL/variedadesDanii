/**
 * Validadores para endpoints de administracion.
 * dailySalesValidator: valida params de consulta de ventas diarias (from, to).
 */

// query - Funcion de express-validator para validar query params.
import { query } from "express-validator";

/** Validacion de consulta de ventas diarias. */
export const dailySalesValidator = [
  query("from")
    .notEmpty()
    .withMessage("from date is required")
    .isISO8601()
    .withMessage("from must be a valid date (YYYY-MM-DD)"),

  query("to")
    .notEmpty()
    .withMessage("to date is required")
    .isISO8601()
    .withMessage("to must be a valid date (YYYY-MM-DD)"),
];
