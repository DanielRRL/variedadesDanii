/**
 * Controlador de Fidelizacion (Loyalty).
 * Maneja los endpoints del programa de puntos y codigos de referido.
 * Delega la logica de negocio a LoyaltyService y ReferralService.
 * El userId del cliente autenticado se extrae del JWT via req.userId.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// LoyaltyService - Servicio de puntos, niveles y canje.
import { LoyaltyService } from "../../application/services/LoyaltyService";

// ReferralService - Servicio de codigos de referido.
import { ReferralService } from "../../application/services/ReferralService";

// AppError - Para lanzar errores HTTP controlados desde el controlador.
import { AppError } from "../../utils/AppError";

export class LoyaltyController {
  /**
   * Recibe los servicios de fidelizacion y referidos via inyeccion de dependencias.
   * @param loyaltyService  - Servicio de puntos y niveles del programa.
   * @param referralService - Servicio de codigos de referido.
   */
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly referralService: ReferralService,
  ) {}

  /**
   * GET /api/loyalty/account
   * Retorna el resumen de la cuenta de fidelizacion del usuario autenticado.
   * Crea la cuenta automaticamente si el usuario no tiene una.
   * Responde 200 con { account, transactions }.
   */
  getMyAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId as string;
      const summary = await this.loyaltyService.getAccountSummary(userId);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/loyalty/transactions?page=1&limit=20
   * Retorna el historial paginado de movimientos de puntos del usuario autenticado.
   * Query params: page (default 1), limit (default 20).
   * Responde 200 con array de LoyaltyTransaction.
   */
  getMyTransactions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId as string;
      const page   = parseInt(String(req.query.page  ?? "1"),  10);
      const limit  = parseInt(String(req.query.limit ?? "20"), 10);
      const transactions = await this.loyaltyService.getTransactions(
        userId,
        page,
        limit
      );
      res.json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/loyalty/redeem
   * Canjea puntos como descuento en una orden del usuario autenticado.
   * Body: { points: number; orderId: string }
   * Responde 200 con mensaje de confirmacion.
   */
  redeemPoints = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId as string;
      const { points, orderId } = req.body;

      if (!points || !orderId) {
        throw AppError.badRequest("points and orderId are required.");
      }

      await this.loyaltyService.redeemPoints(userId, { points, orderId });
      res.json({
        success: true,
        message: `${points} points redeemed successfully for order ${orderId}.`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/loyalty/referral-code
   * Retorna (o crea) el codigo de referido del usuario autenticado.
   * Responde 200 con { code, usageCount, totalReferrals }.
   */
  getMyReferralCode = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId as string;
      const stats = await this.referralService.getCodeStats(userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/loyalty/apply-referral
   * Aplica un codigo de referido para el usuario autenticado.
   * Body: { code: string }
   * Acredita puntos a ambas partes si el codigo es valido y no fue usado antes.
   * Responde 200 con mensaje de confirmacion.
   */
  applyReferralCode = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId as string;
      const { code } = req.body;

      if (!code) {
        throw AppError.badRequest("Referral code is required.");
      }

      await this.referralService.applyReferralCode(code, userId);
      res.json({
        success: true,
        message: "Referral code applied successfully. Points have been credited to both accounts.",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/loyalty/adjust
   * Ajuste manual de puntos por un administrador.
   * Body: { userId: string; points: number; reason: string }
   * El adminId se extrae del JWT (req.userId).
   * Permite creditos (points > 0) y debitos (points < 0).
   * Responde 200 con mensaje de confirmacion.
   */
  adminAdjustPoints = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId  = (req as any).userId as string;
      const { userId, points, reason } = req.body;

      if (!userId || points === undefined || !reason) {
        throw AppError.badRequest("userId, points and reason are required.");
      }

      await this.loyaltyService.adjustPoints(userId, points, reason, adminId);
      res.json({
        success: true,
        message: `Points adjusted successfully for user ${userId}.`,
      });
    } catch (error) {
      next(error);
    }
  };
}
