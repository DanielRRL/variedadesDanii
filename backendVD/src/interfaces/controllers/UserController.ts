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

// prisma - For search queries with gram account join.
import prisma from "../../config/database";

export class UserController {
  /** Recibe IUserRepository inyectado desde app.ts. */
  constructor(private readonly userRepo: IUserRepository) {}

  /** GET /users - Lista usuarios con búsqueda opcional por nombre/email y límite. */
  getAll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
      const limit = req.query.limit ? Math.min(Math.max(1, Number(req.query.limit)), 100) : undefined;
      const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
      const pageSize = limit ?? 50;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: { gramAccount: { select: { currentGrams: true } } },
        }),
        prisma.user.count({ where }),
      ]);

      const sanitized = users.map((u: any) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        role: u.role,
        active: u.active,
        emailVerified: u.emailVerified ?? false,
        createdAt: u.createdAt,
        gramAccount: u.gramAccount ? { currentGrams: u.gramAccount.currentGrams } : undefined,
      }));

      res.json({
        success: true,
        data: {
          users: sanitized,
          total,
          totalPages: Math.ceil(total / pageSize),
          page,
        },
      });
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
