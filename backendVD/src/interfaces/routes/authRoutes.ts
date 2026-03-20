/**
 * Rutas de autenticacion (registro y login).
 * Son publicas, no requieren JWT.
 * Usan validadores de express-validator antes del controlador.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// AuthController - Controlador con logica de registro y login.
import { AuthController } from "../controllers/AuthController";

// registerValidator, loginValidator - Validaciones de campos para auth.
import { registerValidator, loginValidator } from "../validators/authValidator";

// validate - Middleware que revisa errores de express-validator.
import { validate } from "../validators/validate";

/**
 * Crea y retorna el router de autenticacion.
 * @param authController - Controlador inyectado desde app.ts.
 * POST /register - Registrar nuevo usuario.
 * POST /login - Iniciar sesion y obtener JWT.
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

  return router;
};
