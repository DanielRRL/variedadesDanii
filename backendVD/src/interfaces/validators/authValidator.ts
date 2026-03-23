/**
 * Validadores para endpoints de autenticacion.
 * Usa express-validator para validar campos del body.
 * Se aplican como middleware antes del controlador.
 */

// body - Funcion de express-validator para validar campos del request body.
import { body } from "express-validator";

/** Validacion de registro: name, phone, email, password (min 6 chars). */
export const registerValidator = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("phone")
    .notEmpty()
    .withMessage("Phone is required")
    .matches(/^\+?\d{7,15}$/)
    .withMessage("Invalid phone number format"),

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .matches(/[#@%$*]/) 
    .withMessage("Password must contain at least one special character (#, @, %, $, *)"),
];

/** Validacion de login: solo email y password requeridos. */
export const loginValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),

  body("password").notEmpty().withMessage("Password is required"),
];

/** Validacion de verify-email: token hexadecimal de 64 caracteres. */
export const verifyEmailValidator = [
  body("token")
    .notEmpty()
    .withMessage("Verification token is required")
    .isHexadecimal()
    .withMessage("Invalid token format")
    .isLength({ min: 64, max: 64 })
    .withMessage("Invalid token length"),
];

/** Validacion de resend-verification y forgot-password: email valido. */
export const emailValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
];

/** Validacion de reset-password: token, newPassword y confirmPassword. */
export const resetPasswordValidator = [
  body("token")
    .notEmpty()
    .withMessage("Reset token is required")
    .isHexadecimal()
    .withMessage("Invalid token format")
    .isLength({ min: 64, max: 64 })
    .withMessage("Invalid token length"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required"),
];

