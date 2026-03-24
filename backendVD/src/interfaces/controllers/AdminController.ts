/**
 * Controlador de administracion.
 * Expone endpoints de dashboard y reportes de negocio.
 * Solo accesible por usuarios con rol ADMIN.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// AdminService - Servicio de reportes y metricas admin.
import { AdminService } from "../../application/services/AdminService";

// ReportService - Genera reportes CSV y PDF descargables.
import { ReportService } from "../../application/services/ReportService";

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
}
