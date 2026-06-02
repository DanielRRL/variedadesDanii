/**
 * Servicio de administracion.
 * Expone metricas y reportes de negocio para el panel administrativo.
 * Todas las operaciones son de lectura; no modifica datos.
 */

// IAdminRepository - Contrato del repositorio de reportes admin.
import {
  IAdminRepository,
  DashboardSummary,
  DailySalesResult,
  TopProductResult,
  LowStockEssence,
} from "../../domain/repositories/IAdminRepository";

// AppError - Errores HTTP para validaciones de parametros.
import { AppError } from "../../utils/AppError";

/** Umbral por defecto de esencia (ml) para considerar stock bajo. */
const DEFAULT_LOW_STOCK_THRESHOLD_ML = 500;

/** Cantidad por defecto de top productos a retornar. */
const DEFAULT_TOP_PRODUCTS_LIMIT = 10;

export class AdminService {
  /** Recibe el repositorio admin via inyeccion de dependencias. */
  constructor(private readonly adminRepo: IAdminRepository) {}

  /**
   * Obtiene el resumen general del dashboard.
   * Incluye: ventas de hoy, ordenes de hoy, total clientes, esencias con stock bajo.
   */
  async getDashboardSummary(
    thresholdMl: number = DEFAULT_LOW_STOCK_THRESHOLD_ML
  ): Promise<DashboardSummary> {
    return this.adminRepo.getDashboardSummary(thresholdMl);
  }

  /**
   * Obtiene reporte de ventas diarias en un rango de fechas.
   * Valida que from no sea posterior a to y que el rango no exceda 90 dias.
   * El `to` se ajusta al final del dia (23:59:59.999) para cubrir el dia completo.
   */
  async getDailySales(from: Date, to: Date): Promise<DailySalesResult[]> {
    if (from.getTime() > to.getTime()) {
      throw AppError.badRequest("'from' date cannot be after 'to' date");
    }

    const diffDays =
      (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      throw AppError.badRequest("Date range cannot exceed 90 days");
    }

    const endOfDay = new Date(to);
    endOfDay.setHours(23, 59, 59, 999);

    return this.adminRepo.getDailySales(from, endOfDay);
  }

  /**
   * Obtiene los productos mas vendidos ordenados por cantidad.
   * Limit entre 1 y 50.
   */
  async getTopProducts(
    limit: number = DEFAULT_TOP_PRODUCTS_LIMIT
  ): Promise<TopProductResult[]> {
    const sanitizedLimit = Math.min(Math.max(1, limit), 50);
    return this.adminRepo.getTopProducts(sanitizedLimit);
  }

  /**
   * Obtiene esencias con stock por debajo del umbral en ml.
   * Util para alertas de reabastecimiento.
   */
  async getLowStockEssences(
    thresholdMl: number = DEFAULT_LOW_STOCK_THRESHOLD_ML
  ): Promise<LowStockEssence[]> {
    if (thresholdMl <= 0) {
      throw AppError.badRequest("Threshold must be greater than 0");
    }
    return this.adminRepo.getLowStockEssences(thresholdMl);
  }
}
