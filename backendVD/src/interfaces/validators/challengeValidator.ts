/**
 * Validadores para retos semanales (challenges).
 */

import { body } from "express-validator";

export const createChallengeValidator = [
  body("description")
    .notEmpty().withMessage("description is required")
    .isLength({ min: 1, max: 500 }).withMessage("description max 500 characters"),
  body("gramReward")
    .notEmpty().withMessage("gramReward is required")
    .isInt({ gt: 0 }).withMessage("gramReward must be a positive integer"),
  body("requiredPurchases")
    .notEmpty().withMessage("requiredPurchases is required")
    .isInt({ gt: 0 }).withMessage("requiredPurchases must be a positive integer"),
  body("weekStart")
    .notEmpty().withMessage("weekStart is required")
    .isISO8601().withMessage("weekStart must be ISO 8601 date"),
  body("weekEnd")
    .notEmpty().withMessage("weekEnd is required")
    .isISO8601().withMessage("weekEnd must be ISO 8601 date"),
];
