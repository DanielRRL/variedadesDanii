/**
 * Rutas de autenticacion.
 * Son publicas, no requieren JWT.
 * Usan validadores de express-validator antes del controlador.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// AuthController - Controlador con logica de registro, login y flujos de email.
import { AuthController } from "../controllers/AuthController";

// Validadores de campos para los distintos endpoints de auth.
import {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  emailValidator,
  resetPasswordValidator,
} from "../validators/authValidator";

// validate - Middleware que revisa errores de express-validator.
import { validate } from "../validators/validate";

/**
 * Crea y retorna el router de autenticacion.
 * @param authController - Controlador inyectado desde app.ts.
 * POST /register             - Registrar nuevo usuario.
 * POST /login                - Iniciar sesion y obtener JWT.
 * POST /verify-email         - Verificar correo con token.
 * POST /resend-verification  - Reenviar correo de verificacion.
 * POST /forgot-password      - Iniciar flujo de recuperacion de contrasena.
 * POST /reset-password       - Establecer nueva contrasena con token.
 */
export const createAuthRoutes = (authController: AuthController): Router => {
  const router = Router();

  // POST /register - Cadena: validar campos -> revisar errores -> registrar
  router.post(
    "/register",
    registerValidator,
    validate,
    authController.register
  );

  // POST /login - Cadena: validar campos -> revisar errores -> login
  router.post("/login", loginValidator, validate, authController.login);

  // POST /verify-email - Verifica el correo del usuario con el token recibido
  router.post(
    "/verify-email",
    verifyEmailValidator,
    validate,
    authController.verifyEmail
  );

  // POST /resend-verification - Reenvía el correo de verificacion
  router.post(
    "/resend-verification",
    emailValidator,
    validate,
    authController.resendVerification
  );

  // POST /forgot-password - Inicia el flujo de recuperacion de contrasena
  router.post(
    "/forgot-password",
    emailValidator,
    validate,
    authController.forgotPassword
  );

  // POST /reset-password - Establece nueva contrasena usando el token de reset
  router.post(
    "/reset-password",
    resetPasswordValidator,
    validate,
    authController.resetPassword
  );

  // POST /google - Login/registro con Google Sign-In (no requiere validadores)
  router.post("/google", authController.googleLogin);

  return router;
};

