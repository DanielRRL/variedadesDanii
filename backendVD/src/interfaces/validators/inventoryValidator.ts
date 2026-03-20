/**
 * Validadores para endpoints de inventario.
 * essenceMovementValidator: movimientos de esencia (ml, tipo, razon).
 * bottleMovementValidator: movimientos de frascos (qty, tipo, razon).
 * productMovementValidator: movimientos de productos generales (qty, tipo, razon).
 * auditValidator: auditoria de inventario (entityType, entityId, physicalValue).
 */

// body - Funcion de express-validator para validar campos del request body.
import { body } from "express-validator";

/** Razones validas compartidas por todos los movimientos. */
const VALID_REASONS = ["PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "REFILL"];

/** Validacion de movimiento de esencia. */
export const essenceMovementValidator = [
  body("essenceId")
    .notEmpty()
    .withMessage("essenceId is required")
    .isUUID()
    .withMessage("essenceId must be a valid UUID"),

  body("type")
    .notEmpty()
    .withMessage("type is required")
    .isIn(["IN", "OUT"])
    .withMessage("type must be IN or OUT"),

  body("ml")
    .notEmpty()
    .withMessage("ml is required")
    .isFloat({ gt: 0 })
    .withMessage("ml must be greater than 0"),

  body("reason")
    .notEmpty()
    .withMessage("reason is required")
    .isIn(VALID_REASONS)
    .withMessage("Invalid reason"),
];

/** Validacion de movimiento de frascos. */
export const bottleMovementValidator = [
  body("bottleId")
    .notEmpty()
    .withMessage("bottleId is required")
    .isUUID()
    .withMessage("bottleId must be a valid UUID"),

  body("type")
    .notEmpty()
    .withMessage("type is required")
    .isIn(["IN", "OUT"])
    .withMessage("type must be IN or OUT"),

  body("quantity")
    .notEmpty()
    .withMessage("quantity is required")
    .isInt({ gt: 0 })
    .withMessage("quantity must be greater than 0"),

  body("reason")
    .notEmpty()
    .withMessage("reason is required")
    .isIn(VALID_REASONS)
    .withMessage("Invalid reason"),
];

/** Validacion de movimiento de producto general (ACCESSORY/GENERAL). */
export const productMovementValidator = [
  body("productId")
    .notEmpty()
    .withMessage("productId is required")
    .isUUID()
    .withMessage("productId must be a valid UUID"),

  body("type")
    .notEmpty()
    .withMessage("type is required")
    .isIn(["IN", "OUT"])
    .withMessage("type must be IN or OUT"),

  body("quantity")
    .notEmpty()
    .withMessage("quantity is required")
    .isInt({ gt: 0 })
    .withMessage("quantity must be greater than 0"),

  body("reason")
    .notEmpty()
    .withMessage("reason is required")
    .isIn(VALID_REASONS)
    .withMessage("Invalid reason"),
];

/** Validacion de auditoria de inventario. */
export const auditValidator = [
  body("entityType")
    .notEmpty()
    .withMessage("entityType is required")
    .isIn(["ESSENCE", "BOTTLE", "PRODUCT"])
    .withMessage("entityType must be ESSENCE, BOTTLE or PRODUCT"),

  body("entityId")
    .notEmpty()
    .withMessage("entityId is required")
    .isUUID()
    .withMessage("entityId must be a valid UUID"),

  body("physicalValue")
    .notEmpty()
    .withMessage("physicalValue is required")
    .isFloat({ min: 0 })
    .withMessage("physicalValue must be 0 or greater"),

  body("notes")
    .optional()
    .isString()
    .withMessage("notes must be a string")
    .isLength({ max: 500 })
    .withMessage("notes cannot exceed 500 characters"),
];
