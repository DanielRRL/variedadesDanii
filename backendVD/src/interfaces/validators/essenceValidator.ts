/**
 * Validadores para endpoints de esencias y catalogos (familias, casas).
 */

import { body } from "express-validator";

export const createEssenceValidator = [
  body("name")
    .notEmpty().withMessage("Essence name is required")
    .isLength({ min: 1, max: 200 }).withMessage("Name must be between 1 and 200 characters"),
  body("olfactiveFamilyId")
    .notEmpty().withMessage("Olfactive family is required"),
  body("description")
    .optional({ values: "falsy" })
    .isLength({ max: 1000 }).withMessage("Description max 1000 characters"),
  body("houseId").optional(),
  body("inspirationBrand").optional(),
  body("photoUrl").optional({ values: "falsy" }).isString().isLength({ max: 500 }),
];

export const createFamilyValidator = [
  body("name")
    .notEmpty().withMessage("Family name is required")
    .isLength({ min: 1, max: 100 }).withMessage("Name max 100 characters"),
];

export const createHouseValidator = [
  body("name")
    .notEmpty().withMessage("House name is required")
    .isLength({ min: 1, max: 100 }).withMessage("Name max 100 characters"),
  body("handle")
    .notEmpty().withMessage("Handle is required")
    .isLength({ min: 1, max: 50 }).withMessage("Handle max 50 characters")
    .matches(/^[a-z0-9]+$/).withMessage("Handle must be lowercase alphanumeric"),
  body("description").optional({ values: "falsy" }),
  body("logoUrl").optional({ values: "falsy" }).isURL().withMessage("Invalid logo URL"),
];

export const updateEssenceValidator = [
  body("name").optional().isLength({ min: 1, max: 200 }),
  body("description").optional({ values: "falsy" }).isLength({ max: 1000 }),
  body("inspirationBrand").optional(),
  body("houseId").optional(),
  body("photoUrl").optional({ values: "falsy" }).isString().isLength({ max: 500 }),
];
