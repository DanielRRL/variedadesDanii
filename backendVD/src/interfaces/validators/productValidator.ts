/**
 * Validador para creacion de productos.
 * Soporta 3 categorias: PERFUME, ACCESSORY, GENERAL.
 * PERFUME requiere essenceId, bottleId y mlQuantity.
 * Todos requieren name, category y price.
 */

// body - Funcion de express-validator para validar campos del request body.
import { body } from "express-validator";

/** Validacion de creacion de producto (dinamico segun categoria). */
export const createProductValidator = [
  body("name")
    .notEmpty()
    .withMessage("name is required")
    .isString()
    .withMessage("name must be a string")
    .isLength({ min: 2, max: 150 })
    .withMessage("name must be between 2 and 150 characters"),

  body("category")
    .notEmpty()
    .withMessage("category is required")
    .isIn(["PERFUME", "ACCESSORY", "GENERAL"])
    .withMessage("category must be PERFUME, ACCESSORY or GENERAL"),

  body("price")
    .notEmpty()
    .withMessage("price is required")
    .isFloat({ gt: 0 })
    .withMessage("price must be greater than 0"),

  body("description")
    .optional()
    .isString()
    .withMessage("description must be a string")
    .isLength({ max: 500 })
    .withMessage("description cannot exceed 500 characters"),

  // Campos condicionales para PERFUME
  body("essenceId")
    .if(body("category").equals("PERFUME"))
    .notEmpty()
    .withMessage("essenceId is required for PERFUME products")
    .isUUID()
    .withMessage("essenceId must be a valid UUID"),

  body("bottleId")
    .if(body("category").equals("PERFUME"))
    .notEmpty()
    .withMessage("bottleId is required for PERFUME products")
    .isUUID()
    .withMessage("bottleId must be a valid UUID"),

  body("mlQuantity")
    .if(body("category").equals("PERFUME"))
    .notEmpty()
    .withMessage("mlQuantity is required for PERFUME products")
    .isFloat({ gt: 0 })
    .withMessage("mlQuantity must be greater than 0"),
];
