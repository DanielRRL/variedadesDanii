/**
 * Validadores para endpoints de fidelizacion y referidos.
 */

import { body } from "express-validator";

export const redeemPointsValidator = [
  body("points")
    .notEmpty().withMessage("points is required")
    .isInt({ gt: 0 }).withMessage("points must be a positive integer"),
  body("orderId")
    .notEmpty().withMessage("orderId is required"),
];

export const applyReferralValidator = [
  body("code")
    .notEmpty().withMessage("Referral code is required")
    .isLength({ min: 1, max: 20 }).withMessage("Referral code max 20 characters"),
];

export const adminAdjustPointsValidator = [
  body("userId")
    .notEmpty().withMessage("userId is required"),
  body("points")
    .notEmpty().withMessage("points is required")
    .isInt().withMessage("points must be an integer"),
  body("reason")
    .notEmpty().withMessage("reason is required")
    .isLength({ min: 1, max: 500 }).withMessage("reason max 500 characters"),
];
