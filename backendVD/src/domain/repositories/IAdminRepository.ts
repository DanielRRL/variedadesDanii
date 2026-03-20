/**
 * Interface del repositorio de Administracion.
 * Define consultas de reportes y metricas del negocio
 * para el panel administrativo.
 * Solo lectura: no modifica datos, solo los consulta.
 */

/** Resumen de ventas de un dia especifico. */
export interface DailySalesResult {
  date: string;
  totalSales: number;
  ordersCount: number;
}

/** Producto con su cantidad total vendida. */
export interface TopProductResult {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

/** Esencia con stock por debajo del umbral. */
export interface LowStockEssence {
  essenceId: string;
  essenceName: string;
  currentStockMl: number;
}

/** Resumen general del dashboard. */
export interface DashboardSummary {
  todaySales: number;
  todayOrders: number;
  totalCustomers: number;
  lowStockCount: number;
}

/** Contrato del repositorio de administracion. */
export interface IAdminRepository {
  /** Obtiene el resumen general del dashboard para hoy. */
  getDashboardSummary(lowStockThresholdMl: number): Promise<DashboardSummary>;

  /** Obtiene ventas agrupadas por dia en un rango de fechas. */
  getDailySales(from: Date, to: Date): Promise<DailySalesResult[]>;

  /** Obtiene los productos mas vendidos (por cantidad). */
  getTopProducts(limit: number): Promise<TopProductResult[]>;

  /** Obtiene esencias con stock menor al umbral indicado. */
  getLowStockEssences(thresholdMl: number): Promise<LowStockEssence[]>;
}
