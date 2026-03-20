/**
 * Implementacion del repositorio de administracion con Prisma.
 * Contiene consultas de reportes y metricas del negocio.
 * Usa queries de agregacion de Prisma y SQL crudo cuando es necesario
 * para calcular estadisticas complejas.
 */

// prisma - Instancia singleton del cliente de base de datos.
import prisma from "../../config/database";

// Tipos de la interfaz de administracion.
import {
  IAdminRepository,
  DashboardSummary,
  DailySalesResult,
  TopProductResult,
  LowStockEssence,
} from "../../domain/repositories/IAdminRepository";

export class PrismaAdminRepository implements IAdminRepository {
  /**
   * Obtiene el resumen general del dashboard para hoy.
   * Incluye: ventas del dia, ordenes, clientes totales, y esencias con stock bajo.
   */
  async getDashboardSummary(lowStockThresholdMl: number): Promise<DashboardSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Ventas y ordenes del dia (solo ordenes pagadas o entregadas)
    const todayOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { in: ["PAID", "PREPARING", "SHIPPED", "DELIVERED"] },
      },
      select: { total: true },
    });

    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);

    // Total de clientes registrados
    const totalCustomers = await prisma.user.count({
      where: { role: "CLIENT", active: true },
    });

    // Contar esencias con stock bajo.
    // Se obtienen todas las esencias activas y se calcula el stock de cada una.
    const essences = await prisma.essence.findMany({
      where: { active: true },
      select: { id: true },
    });

    let lowStockCount = 0;
    for (const essence of essences) {
      const inSum = await prisma.essenceMovement.aggregate({
        where: { essenceId: essence.id, type: "IN" },
        _sum: { ml: true },
      });
      const outSum = await prisma.essenceMovement.aggregate({
        where: { essenceId: essence.id, type: "OUT" },
        _sum: { ml: true },
      });
      const stock = (inSum._sum.ml || 0) - (outSum._sum.ml || 0);
      if (stock < lowStockThresholdMl) {
        lowStockCount++;
      }
    }

    return {
      todaySales,
      todayOrders: todayOrders.length,
      totalCustomers,
      lowStockCount,
    };
  }

  /**
   * Obtiene ventas agrupadas por dia en un rango de fechas.
   * Solo cuenta ordenes con estado PAID o posterior (no PENDING ni CANCELLED).
   */
  async getDailySales(from: Date, to: Date): Promise<DailySalesResult[]> {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: { in: ["PAID", "PREPARING", "SHIPPED", "DELIVERED"] },
      },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Agrupar por fecha (YYYY-MM-DD)
    const salesByDate = new Map<string, { total: number; count: number }>();

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split("T")[0];
      const existing = salesByDate.get(dateKey) || { total: 0, count: 0 };
      existing.total += order.total;
      existing.count += 1;
      salesByDate.set(dateKey, existing);
    }

    return Array.from(salesByDate.entries()).map(([date, data]) => ({
      date,
      totalSales: data.total,
      ordersCount: data.count,
    }));
  }

  /**
   * Obtiene los productos mas vendidos por cantidad total.
   * Agrupa order_items por producto y ordena de mayor a menor.
   */
  async getTopProducts(limit: number): Promise<TopProductResult[]> {
    const items = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    // Obtener nombres de los productos
    const results: TopProductResult[] = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true },
      });

      results.push({
        productId: item.productId,
        productName: product?.name || "Producto eliminado",
        totalQuantity: item._sum.quantity || 0,
        totalRevenue: item._sum.subtotal || 0,
      });
    }

    return results;
  }

  /**
   * Obtiene esencias con stock menor al umbral indicado.
   * Calcula el stock de cada esencia activa y filtra las que estan bajas.
   */
  async getLowStockEssences(thresholdMl: number): Promise<LowStockEssence[]> {
    const essences = await prisma.essence.findMany({
      where: { active: true },
      select: { id: true, name: true },
    });

    const lowStock: LowStockEssence[] = [];

    for (const essence of essences) {
      const inSum = await prisma.essenceMovement.aggregate({
        where: { essenceId: essence.id, type: "IN" },
        _sum: { ml: true },
      });
      const outSum = await prisma.essenceMovement.aggregate({
        where: { essenceId: essence.id, type: "OUT" },
        _sum: { ml: true },
      });
      const stock = (inSum._sum.ml || 0) - (outSum._sum.ml || 0);

      if (stock < thresholdMl) {
        lowStock.push({
          essenceId: essence.id,
          essenceName: essence.name,
          currentStockMl: stock,
        });
      }
    }

    // Ordenar por stock ascendente (las mas criticas primero)
    return lowStock.sort((a, b) => a.currentStockMl - b.currentStockMl);
  }
}
