/**
 * Controlador de administracion.
 * Expone endpoints de dashboard, reportes de negocio, gamificacion y retos semanales.
 * Solo accesible por usuarios con rol ADMIN (excepto getCurrentChallenge que es PUBLIC
 * y getMyProgress que es CLIENT).
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// AdminService - Servicio de reportes y metricas admin.
import { AdminService } from "../../application/services/AdminService";

// ReportService - Genera reportes CSV y PDF descargables.
import { ReportService } from "../../application/services/ReportService";

// prisma - Para queries directas de gamificacion y retos.
import prisma from "../../config/database";

// AppError - Errores HTTP personalizados.
import { AppError } from "../../utils/AppError";

// param - Helper de Express 5 para extraer params.
import { param } from "../../utils/param";

export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reportService: ReportService
  ) {}

  /** GET /admin/dashboard - Resumen general con metricas del dia. */
  getDashboard = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const threshold = req.query.threshold
        ? Number(req.query.threshold)
        : undefined;
      const summary = await this.adminService.getDashboardSummary(threshold);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  };

  /** GET /admin/reports/daily-sales?from=YYYY-MM-DD&to=YYYY-MM-DD - Ventas por dia. */
  getDailySales = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const from = new Date(req.query.from as string);
      const to = new Date(req.query.to as string);
      const sales = await this.adminService.getDailySales(from, to);
      res.json({ success: true, data: sales });
    } catch (error) {
      next(error);
    }
  };

  /** GET /admin/reports/top-products?limit=10 - Productos mas vendidos. */
  getTopProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const products = await this.adminService.getTopProducts(limit);
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  };

  /** GET /admin/reports/low-stock?threshold=500 - Esencias con stock bajo. */
  getLowStock = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const threshold = req.query.threshold
        ? Number(req.query.threshold)
        : undefined;
      const essences = await this.adminService.getLowStockEssences(threshold);
      res.json({ success: true, data: essences });
    } catch (error) {
      next(error);
    }
  };

  // ── Descargas de reportes ──────────────────────────────────────────────────

  /**
   * GET /admin/reports/sales/csv?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Descarga un CSV con el detalle de ventas del periodo.
   */
  downloadSalesCSV = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const from = new Date(req.query.from as string);
      const to   = new Date(req.query.to   as string);
      const buffer = await this.reportService.generateSalesCSV({ from, to });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="ventas-reporte.csv"');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /admin/reports/sales/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Descarga un PDF con la tabla de ventas y resumen del periodo.
   */
  downloadSalesPDF = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const from = new Date(req.query.from as string);
      const to   = new Date(req.query.to   as string);
      const buffer = await this.reportService.generateSalesPDF({ from, to });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="ventas-reporte.pdf"');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /admin/reports/inventory/csv
   * Descarga un CSV con el estado actual del inventario de esencias.
   */
  downloadInventoryCSV = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const buffer = await this.reportService.generateInventoryCSV();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="inventario-esencias.csv"');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /admin/reports/clients/csv
   * Descarga un CSV con el listado de clientes y datos de fidelizacion.
   */
  downloadClientsCSV = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const buffer = await this.reportService.generateClientsCSV();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="clientes-fidelizacion.csv"');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  // ── Reportes de gamificacion ────────────────────────────────────────────

  /**
   * GET /api/admin/reports/sales-by-type?from=DATE&to=DATE — ADMIN only
   * Ventas agrupadas por productType en un rango de fechas.
   * Retorna: { byType: { LOTION: number, CREAM: number, ... } }
   */
  getSalesByProductType = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const from = new Date(req.query.from as string);
      const to   = new Date(req.query.to   as string);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw AppError.badRequest("from and to must be valid dates (YYYY-MM-DD).");
      }

      // Obtener items de ordenes entregadas/pagadas en el rango con su producto
      const items = await prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: from, lte: to },
            status: { in: ["PAID", "PREPARING", "READY", "DELIVERED"] },
          },
        },
        include: {
          product: { select: { productType: true } },
        },
      });

      // Agrupar por productType
      const byType: Record<string, number> = {};
      for (const item of items) {
        const type = item.product?.productType || "UNKNOWN";
        byType[type] = (byType[type] || 0) + item.subtotal;
      }

      res.json({ success: true, data: { byType } });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/clients/:id/history — ADMIN only
   * Historial completo de un cliente: usuario, ordenes, billetera, canjes, fichas.
   */
  getClientHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const clientId = param(req, "id");

      const [user, orders, gramAccount, redemptions, gameTokens] = await Promise.all([
        prisma.user.findUnique({
          where: { id: clientId },
          select: { id: true, name: true, email: true, phone: true, role: true, active: true, createdAt: true },
        }),
        prisma.order.findMany({
          where: { userId: clientId },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
        }),
        prisma.gramAccount.findUnique({ where: { userId: clientId } }),
        prisma.essenceRedemption.findMany({
          where: { userId: clientId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.gameToken.findMany({
          where: { userId: clientId },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
      ]);

      if (!user) {
        throw AppError.notFound("Client not found");
      }

      res.json({
        success: true,
        data: { user, orders, gramAccount, redemptions, gameTokens },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/gamification/stats — ADMIN only
   * Estadisticas globales del sistema de gamificacion.
   */
  getGamificationStats = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const [
        totalTokensIssued,
        totalGramsEarnedAgg,
        totalGramsRedeemedAgg,
        activeRedemptions,
        currentChallenge,
      ] = await Promise.all([
        prisma.gameToken.count(),
        prisma.gramAccount.aggregate({ _sum: { totalEarned: true } }),
        prisma.gramAccount.aggregate({ _sum: { totalRedeemed: true } }),
        prisma.essenceRedemption.count({ where: { status: "PENDING_DELIVERY" } }),
        prisma.weeklyChallenge.findFirst({
          where: { active: true, weekEnd: { gte: new Date() } },
          orderBy: { weekStart: "desc" },
        }),
      ]);

      // Top 10 jugadores por gramos ganados
      const topGamePlayers = await prisma.gameToken.groupBy({
        by: ["userId"],
        where: { status: "USED" },
        _sum: { gramsWon: true },
        orderBy: { _sum: { gramsWon: "desc" } },
        take: 10,
      });

      // Enriquecer con nombres de usuario
      const enrichedPlayers = await Promise.all(
        topGamePlayers.map(async (p) => {
          const user = await prisma.user.findUnique({
            where: { id: p.userId },
            select: { name: true, email: true },
          });
          return {
            userId: p.userId,
            name: user?.name || "Desconocido",
            email: user?.email || "",
            totalGramsWon: p._sum.gramsWon || 0,
          };
        })
      );

      res.json({
        success: true,
        data: {
          totalTokensIssued,
          totalGramsEarned: totalGramsEarnedAgg._sum.totalEarned || 0,
          totalGramsRedeemed: totalGramsRedeemedAgg._sum.totalRedeemed || 0,
          topGamePlayers: enrichedPlayers,
          activeRedemptions,
          weeklyChallenge: currentChallenge,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // ── Retos semanales ─────────────────────────────────────────────────────

  /**
   * POST /api/admin/challenges — ADMIN only
   * Crea un nuevo reto semanal.
   * Body: { description, gramReward, requiredPurchases, weekStart, weekEnd }
   */
  createWeeklyChallenge = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { description, gramReward, requiredPurchases, weekStart, weekEnd } = req.body;

      if (!description || !gramReward || !requiredPurchases || !weekStart || !weekEnd) {
        throw AppError.badRequest(
          "description, gramReward, requiredPurchases, weekStart and weekEnd are required."
        );
      }

      const start = new Date(weekStart);
      const end   = new Date(weekEnd);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
        throw AppError.badRequest("weekStart must be before weekEnd.");
      }

      const challenge = await prisma.weeklyChallenge.create({
        data: {
          description,
          gramReward: Number(gramReward),
          requiredPurchases: Number(requiredPurchases),
          weekStart: start,
          weekEnd: end,
          active: true,
        },
      });

      res.status(201).json({ success: true, data: challenge });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/challenges/current — PUBLIC
   * Retorna el reto semanal activo actual.
   * Si el usuario esta autenticado (req.userId), incluye su progreso.
   */
  getCurrentChallenge = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const now = new Date();
      const challenge = await prisma.weeklyChallenge.findFirst({
        where: {
          active: true,
          weekStart: { lte: now },
          weekEnd: { gte: now },
        },
        orderBy: { weekStart: "desc" },
      });

      if (!challenge) {
        res.json({ success: true, data: null, message: "No hay reto activo esta semana." });
        return;
      }

      // Si el usuario esta autenticado, agregar su progreso
      const userId = (req as any).userId as string | undefined;
      let progress = null;
      if (userId) {
        progress = await prisma.userChallengeProgress.findUnique({
          where: { userId_challengeId: { userId, challengeId: challenge.id } },
        });
      }

      res.json({
        success: true,
        data: { challenge, progress },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/challenges/my-progress — CLIENT only
   * Retorna el progreso del usuario autenticado en el reto semanal actual.
   */
  getMyProgress = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId as string;
      const now = new Date();

      // Buscar el reto activo actual
      const challenge = await prisma.weeklyChallenge.findFirst({
        where: {
          active: true,
          weekStart: { lte: now },
          weekEnd: { gte: now },
        },
        orderBy: { weekStart: "desc" },
      });

      if (!challenge) {
        res.json({ success: true, data: null, message: "No hay reto activo esta semana." });
        return;
      }

      // Buscar o crear progreso del usuario
      let progress = await prisma.userChallengeProgress.findUnique({
        where: { userId_challengeId: { userId, challengeId: challenge.id } },
      });

      if (!progress) {
        progress = await prisma.userChallengeProgress.create({
          data: { userId, challengeId: challenge.id },
        });
      }

      res.json({
        success: true,
        data: { challenge, progress },
      });
    } catch (error) {
      next(error);
    }
  };
}
