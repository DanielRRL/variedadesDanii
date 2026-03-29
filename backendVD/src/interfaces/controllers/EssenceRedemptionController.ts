/**
 * Controlador de Canjes de Esencia (EssenceRedemptionController).
 * Maneja endpoints de cliente (mis canjes) y admin (entregas pendientes, marcar/cancelar).
 * El userId se extrae del JWT via req.userId.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// IEssenceRedemptionRepository - Repo de canjes de esencia.
import { IEssenceRedemptionRepository } from "../../domain/repositories/IEssenceRedemptionRepository";

// GramService - Para devolver gramos al cancelar un canje.
import { GramService } from "../../application/services/GramService";

// GramSourceType - Tipo de origen para la devolucion de gramos.
import { GramSourceType } from "../../domain/entities/GramAccount";

// AppError - Errores HTTP personalizados.
import { AppError } from "../../utils/AppError";

// param - Helper de Express 5 para extraer params.
import { param } from "../../utils/param";

export class EssenceRedemptionController {
  /**
   * @param essenceRedemptionRepo - Repo de canjes de esencia.
   * @param gramService           - Servicio de gramos para devolucion al cancelar.
   */
  constructor(
    private readonly essenceRedemptionRepo: IEssenceRedemptionRepository,
    private readonly gramService: GramService,
  ) {}

  /**
   * GET /api/redemptions/my — CLIENT only
   * Retorna todos los canjes del usuario autenticado, ordenados por fecha desc.
   */
  getMyRedemptions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId as string;
      const redemptions = await this.essenceRedemptionRepo.findByUser(userId);
      res.json({ success: true, data: redemptions });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/redemptions?page=1&limit=20 — ADMIN only
   * Lista canjes PENDING_DELIVERY paginados, ordenados por createdAt ASC (FIFO).
   */
  adminGetPendingDeliveries = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page  = parseInt(String(req.query.page  ?? "1"),  10);
      const limit = parseInt(String(req.query.limit ?? "20"), 10);

      const { redemptions, total } = await this.essenceRedemptionRepo.findPendingDeliveries(
        page,
        limit,
      );

      res.json({
        success: true,
        data: { redemptions, total, page, limit },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/admin/redemptions/:id/deliver — ADMIN only
   * Marca un canje como entregado.
   * Body: { notes?: string }
   */
  adminMarkDelivered = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = (req as any).userId as string;
      const redemptionId = param(req, "id");
      const { notes } = req.body;

      const redemption = await this.essenceRedemptionRepo.markDelivered(
        redemptionId,
        adminId,
        notes,
      );

      res.json({ success: true, data: redemption });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/admin/redemptions/:id/cancel — ADMIN only
   * Cancela un canje y devuelve los gramos al usuario.
   * Body: { reason: string }
   * Paso 1: cancela el canje en el repo.
   * Paso 2: devuelve los gramos via GramService.earnGrams().
   */
  adminCancelRedemption = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = (req as any).userId as string;
      const redemptionId = param(req, "id");
      const { reason } = req.body;

      if (!reason) {
        throw AppError.badRequest("reason is required to cancel a redemption.");
      }

      // Paso 1: Cancelar el canje en la BD
      const cancelled = await this.essenceRedemptionRepo.cancelRedemption(
        redemptionId,
        adminId,
      );

      // Paso 2: Devolver los gramos al usuario
      await this.gramService.earnGrams(cancelled.userId, {
        sourceType:  GramSourceType.ADMIN_ADJUSTMENT,
        grams:       cancelled.gramsUsed,
        description: `Devolucion por canje cancelado: ${reason}`,
        referenceId: redemptionId,
      });

      res.json({
        success: true,
        data: cancelled,
        message: `Canje cancelado. ${cancelled.gramsUsed}g devueltos al usuario.`,
      });
    } catch (error) {
      next(error);
    }
  };
}
