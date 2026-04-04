/**
 * Controlador de usuarios.
 * CRUD basico de usuarios (sin password en las respuestas).
 * Los datos se sanitizan manualmente para no exponer el hash.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// IUserRepository - Repositorio de usuarios (inyectado).
import { IUserRepository } from "../../domain/repositories/IUserRepository";

// AppError - Para lanzar 404 si el usuario no existe.
import { AppError } from "../../utils/AppError";

// param - Helper de Express 5 para extraer params de forma segura.
import { param } from "../../utils/param";

export class UserController {
  /** Recibe IUserRepository inyectado desde app.ts. */
  constructor(private readonly userRepo: IUserRepository) {}

  /** GET /users - Lista todos los usuarios (sin password). */
  getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const users = await this.userRepo.findAll();
      // Sanitizar: excluir password de la respuesta
      const sanitized = users.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        active: u.active,
        emailVerified: u.emailVerified ?? false,
        createdAt: u.createdAt,
      }));
      res.json({ success: true, data: sanitized });
    } catch (error) {
      next(error);
    }
  };

  /** GET /users/:id - Obtiene un usuario por UUID. */
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.userRepo.findById(param(req, "id"));
      if (!user) {
        throw AppError.notFound("User not found");
      }
      res.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          active: user.active,
          emailVerified: user.emailVerified ?? false,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /** PATCH /users/:id/verify - Admin manually verifies a user's email. */
  adminVerify = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = param(req, "id");
      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw AppError.notFound("User not found");
      }
      if (user.emailVerified) {
        res.json({ success: true, message: "User is already verified" });
        return;
      }
      await this.userRepo.update(userId, { emailVerified: true });
      res.json({ success: true, message: "User verified successfully" });
    } catch (error) {
      next(error);
    }
  };

  /** PATCH /users/:id - Actualiza datos de un usuario. */
  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = await this.userRepo.update(param(req, "id"), req.body);
      res.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          active: user.active,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
