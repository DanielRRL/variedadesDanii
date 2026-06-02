/**
 * Validadores para endpoints de frascos (bottles).
 */

import { body } from "express-validator";

export const createBottleValidator = [
  body("name")
    .notEmpty().withMessage("Bottle name is required")
    .isLength({ min: 1, max: 200 }).withMessage("Name max 200 characters"),
  body("type")
    .notEmpty().withMessage("Bottle type is required")
    .isIn(["STANDARD", "LUXURY"]).withMessage("Type must be STANDARD or LUXURY"),
  body("material")
    .notEmpty().withMessage("Material is required")
    .isLength({ min: 1, max: 200 }).withMessage("Material max 200 characters"),
  body("capacityMl")
    .notEmpty().withMessage("Capacity (ml) is required")
    .isFloat({ gt: 0 }).withMessage("Capacity must be positive"),
];

export const updateBottleValidator = [
  body("name").optional().isLength({ min: 1, max: 200 }),
  body("type").optional().isIn(["STANDARD", "LUXURY"]),
  body("material").optional().isLength({ max: 200 }),
  body("capacityMl").optional().isFloat({ gt: 0 }),
];
