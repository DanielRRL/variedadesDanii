/**
 * Controlador de Gramos (GramController).
 * Maneja endpoints del sistema de gramos: billetera, canje y ajuste admin.
 * El userId del cliente autenticado se extrae del JWT via req.userId.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// GramService - Servicio de acumulacion, canje y consulta de gramos.
import { GramService } from "../../application/services/GramService";

// IGramRepository - Para paginacion directa del historial.
import { IGramRepository } from "../../domain/repositories/IGramRepository";

// IEssenceRedemptionRepository - Para consultar canjes del usuario en getMyAccount.
import { IEssenceRedemptionRepository } from "../../domain/repositories/IEssenceRedemptionRepository";

// AppError - Errores HTTP personalizados.
import { AppError } from "../../utils/AppError";

export class GramController {
  /**
   * @param gramService           - Servicio de gramos.
   * @param gramRepo              - Repo de gramos para paginacion directa.
   * @param essenceRedemptionRepo - Repo de canjes para listar pendientes del usuario.
   */
  constructor(
    private readonly gramService: GramService,
    private readonly gramRepo: IGramRepository,
    private readonly essenceRedemptionRepo: IEssenceRedemptionRepository,
  ) {}

  /**
   * GET /api/grams/account — CLIENT only
   * Retorna la billetera del usuario autenticado con:
   * - account: GramAccount con saldos y totales.
   * - canRedeem: si tiene 5+ compras para desbloquear canje.
   * - pendingRedemptions: lista de canjes PENDING_DELIVERY del usuario.
   * - history: ultimas 10 transacciones de gramos.
   */
  getMyAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId as string;
      const summary = await this.gramService.getAccountSummary(userId);
      const pendingRedemptions = await this.essenceRedemptionRepo.findByUser(userId);

      res.json({
        success: true,
        data: {
          account: summary.account,
          canRedeem: summary.canRedeem,
          pendingRedemptions: pendingRedemptions.filter(
            (r) => r.status === "PENDING_DELIVERY"
          ),
          history: summary.history.slice(0, 10),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/grams/redeem — CLIENT only
   * Canje parcial de gramos por esencia.
   * Body: { gramsToRedeem: number, essenceName: string, essenceId?: string }
   * Valida que gramsToRedeem >= 1 y que el servicio verifique el resto.
   * Retorna el canje creado y el nuevo balance.
   */
  redeemGrams = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId as string;
      const { gramsToRedeem, essenceName, essenceId } = req.body;

      if (!gramsToRedeem || !essenceName) {
        throw AppError.badRequest("gramsToRedeem and essenceName are required.");
      }
      if (typeof gramsToRedeem !== "number" || gramsToRedeem < 1) {
        throw AppError.badRequest("gramsToRedeem must be a number >= 1.");
      }

      const redemption = await this.gramService.redeemPartialGrams(
        userId,
        gramsToRedeem,
        essenceName,
        essenceId,
      );

      // Obtener balance actualizado
      const account = await this.gramService.getOrCreateAccount(userId);

      res.status(201).json({
        success: true,
        data: {
          redemption,
          newBalance: account.currentGrams,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/grams/history?page=1&limit=20 — CLIENT only
   * Historial paginado de transacciones de gramos del usuario autenticado.
   */
  getTransactionHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId as string;
      const page  = parseInt(String(req.query.page  ?? "1"),  10);
      const limit = parseInt(String(req.query.limit ?? "20"), 10);

      const account = await this.gramService.getOrCreateAccount(userId);
      const { transactions, total } = await this.gramRepo.getTransactionHistory(
        account.id!,
        page,
        limit,
      );

      res.json({ success: true, data: { transactions, total, page, limit } });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/grams/adjust — ADMIN only
   * Ajuste manual de gramos de un usuario.
   * Body: { userId: string, delta: number, reason: string }
   */
  adminAdjustGrams = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = (req as any).userId as string;
      const { userId, delta, reason } = req.body;

      if (!userId || delta === undefined || !reason) {
        throw AppError.badRequest("userId, delta and reason are required.");
      }
      if (typeof delta !== "number" || delta === 0) {
        throw AppError.badRequest("delta must be a non-zero number.");
      }

      const account = await this.gramService.adminAdjustGrams(
        userId,
        delta,
        reason,
        adminId,
      );

      res.json({ success: true, data: account });
    } catch (error) {
      next(error);
    }
  };
}
