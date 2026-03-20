/**
 * Controlador de administracion.
 * Expone endpoints de dashboard y reportes de negocio.
 * Solo accesible por usuarios con rol ADMIN.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// AdminService - Servicio de reportes y metricas admin.
import { AdminService } from "../../application/services/AdminService";

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
