/**
 * Validadores para endpoints de ordenes.
 * createOrderValidator: valida productos, cantidades, metodo de pago.
 * updateOrderStatusValidator: valida transicion de estado.
 */

// body - Funcion de express-validator para validar campos del request body.
import { body } from "express-validator";

/** Validacion de creacion de orden. */
export const createOrderValidator = [
  // Debe tener al menos un producto
  body("products")
    .isArray({ min: 1 })
    .withMessage("At least one product is required"),

  // Cada producto debe tener productId UUID valido
  body("products.*.productId")
    .notEmpty()
    .withMessage("productId is required")
    .isUUID()
    .withMessage("productId must be a valid UUID"),

  // Cada producto debe tener cantidad > 0
  body("products.*.quantity")
    .notEmpty()
    .withMessage("quantity is required")
    .isInt({ gt: 0 })
    .withMessage("quantity must be greater than 0"),

  // Metodo de pago obligatorio (Nequi, Daviplata, Bancolombia, Efectivo)
  body("paymentMethod")
    .notEmpty()
    .withMessage("paymentMethod is required")
    .isIn(["NEQUI", "DAVIPLATA", "BANCOLOMBIA", "CASH"])
    .withMessage("Invalid payment method"),

  // Tipo de orden opcional
  body("type")
    .optional()
    .isIn(["ONLINE", "REFILL", "CASH_ON_DELIVERY"])
    .withMessage("Invalid order type"),

  // Direccion opcional pero si viene debe ser UUID
  body("addressId").optional().isUUID().withMessage("addressId must be a valid UUID"),

  // Flag de devolucion de frasco opcional
  body("isBottleReturn")
    .optional()
    .isBoolean()
    .withMessage("isBottleReturn must be boolean"),
];

/** Validacion de actualizacion de estado de orden. */
export const updateOrderStatusValidator = [
  body("status")
    .notEmpty()
    .withMessage("status is required")
    .isIn(["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"])
    .withMessage("Invalid order status"),
];
