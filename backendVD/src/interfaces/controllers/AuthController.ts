/**
 * Controlador de autenticacion.
 * Expone endpoints de registro y login.
 * Delega toda la logica al AuthService.
 */

// Request, Response, NextFunction - Tipos base de Express para handlers.
import { Request, Response, NextFunction } from "express";

// AuthService - Servicio de negocio para registro/login con JWT.
import { AuthService } from "../../application/services/AuthService";

export class AuthController {
  /** Recibe AuthService inyectado desde app.ts. */
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/register - Registra un usuario nuevo y retorna token. */
  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /** POST /auth/login - Autentica credenciales y retorna token. */
  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
