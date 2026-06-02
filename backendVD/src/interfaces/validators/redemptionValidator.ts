/**
 * Validadores para redemptions de esencia (admin endpoints).
 */

import { body } from "express-validator";

export const deliverRedemptionValidator = [
  body("notes")
    .optional({ values: "falsy" })
    .isLength({ max: 500 }).withMessage("notes max 500 characters"),
];

export const cancelRedemptionValidator = [
  body("reason")
    .notEmpty().withMessage("reason is required")
    .isLength({ min: 1, max: 500 }).withMessage("reason max 500 characters"),
];
