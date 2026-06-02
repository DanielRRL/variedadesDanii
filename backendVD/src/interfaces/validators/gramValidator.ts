/**
 * Validadores para endpoints de gramos (redeem, admin adjust).
 */

import { body } from "express-validator";

export const redeemGramsValidator = [
  body("gramsToRedeem")
    .notEmpty().withMessage("gramsToRedeem is required")
    .isInt({ gt: 0 }).withMessage("gramsToRedeem must be a positive integer"),
  body("essenceName")
    .notEmpty().withMessage("essenceName is required")
    .isLength({ min: 1, max: 200 }).withMessage("essenceName max 200 characters"),
  body("essenceId").optional(),
];

export const adminAdjustGramsValidator = [
  body("userId")
    .notEmpty().withMessage("userId is required"),
  body("delta")
    .notEmpty().withMessage("delta is required")
    .isInt().withMessage("delta must be an integer"),
  body("reason")
    .notEmpty().withMessage("reason is required")
    .isLength({ min: 1, max: 500 }).withMessage("reason max 500 characters"),
];
