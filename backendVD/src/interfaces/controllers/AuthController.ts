/**
 * Controlador de autenticacion.
 * Expone endpoints de registro, login, verificacion de correo
 * y restablecimiento de contrasena.
 * Delega toda la logica al AuthService.
 */

// Request, Response, NextFunction - Tipos base de Express para handlers.
import { Request, Response, NextFunction } from "express";

// AuthService - Servicio de negocio para registro/login/verificacion/reset con JWT.
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

  /** POST /auth/verify-email - Verifica el correo del usuario con el token recibido. */
  verifyEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token } = req.body;
      await this.authService.verifyEmail(token);
      res.status(200).json({
        success: true,
        message: "Email verified successfully.",
      });
    } catch (error) {
      next(error);
    }
  };

  /** POST /auth/resend-verification - Reenvía el correo de verificacion al usuario. */
  resendVerification = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email } = req.body;
      await this.authService.resendVerificationEmail(email);
      // Respuesta generica para no revelar si el email existe en el sistema
      res.status(200).json({
        success: true,
        message: "If your email is registered and unverified, a new verification email has been sent.",
      });
    } catch (error) {
      next(error);
    }
  };

  /** POST /auth/forgot-password - Inicia el flujo de recuperacion de contrasena. */
  forgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email } = req.body;
      await this.authService.forgotPassword(email);
      // Respuesta generica para prevenir enumeracion de usuarios
      res.status(200).json({
        success: true,
        message: "If your email is registered, you will receive a password reset link shortly.",
      });
    } catch (error) {
      next(error);
    }
  };

  /** POST /auth/reset-password - Establece una nueva contrasena usando el token de reset. */
  resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token, newPassword, confirmPassword } = req.body;
      // Validar que ambas contrasenas coincidan antes de delegar al servicio
      if (newPassword !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: "Passwords do not match.",
        });
        return;
      }
      await this.authService.resetPassword(token, newPassword);
      res.status(200).json({
        success: true,
        message: "Password reset successfully. You can now log in with your new password.",
      });
    } catch (error) {
      next(error);
    }
  };

  /** POST /auth/google - Autentica con Google ID token. */
  googleLogin = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        res.status(400).json({ success: false, message: "idToken is required" });
        return;
      }
      const result = await this.authService.googleLogin(idToken);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
