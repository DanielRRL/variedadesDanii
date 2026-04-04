/**
 * Controlador POS (Point of Sale).
 * Maneja ventas presenciales, consultas de ventas por canal y resumen de ingresos.
 * Solo accesible por ADMIN y SELLER.
 */

import { Request, Response, NextFunction } from "express";
import { SalesService } from "../../application/services/SalesService";
import { IOrderRepository } from "../../domain/repositories/IOrderRepository";
import { AppError } from "../../utils/AppError";
import { param } from "../../utils/param";
import prisma from "../../config/database";

export class POSController {
  constructor(
    private readonly salesService: SalesService,
    private readonly orderRepo: IOrderRepository,
  ) {}

  /** POST /api/pos/sales — Registra una venta presencial. */
  createSale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.salesService.createPOSSale(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/pos/sales — Lista ventas filtradas por canal y fecha. */
  getSales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { from, to, channel, page = "1", limit = "20" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (channel === "ECOMMERCE" || channel === "IN_STORE") {
        where.saleChannel = channel;
      }

      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = new Date(from as string);
        if (to) where.createdAt.lte = new Date(to as string);
      }

      const [sales, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
            items: { include: { product: true } },
            payment: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limitNum,
        }),
        prisma.order.count({ where }),
      ]);

      res.json({
        success: true,
        data: sales,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/pos/sales/:id — Detalle de una venta con factura. */
  getSaleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = param(req, "id");
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          items: { include: { product: { include: { essence: true, bottle: true } } } },
          payment: true,
          discounts: true,
        },
      });

      if (!order) {
        throw AppError.notFound("Venta no encontrada");
      }

      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/pos/revenue — Resumen de ingresos por canal. */
  getRevenueSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { from, to } = req.query;

      const dateFilter: any = {};
      if (from || to) {
        dateFilter.createdAt = {};
        if (from) dateFilter.createdAt.gte = new Date(from as string);
        if (to) dateFilter.createdAt.lte = new Date(to as string);
      }

      // Totales por canal
      const [ecommerce, inStore] = await Promise.all([
        prisma.order.aggregate({
          where: { ...dateFilter, saleChannel: "ECOMMERCE", status: { not: "CANCELLED" } },
          _sum: { total: true },
          _count: { id: true },
        }),
        prisma.order.aggregate({
          where: { ...dateFilter, saleChannel: "IN_STORE", status: { not: "CANCELLED" } },
          _sum: { total: true },
          _count: { id: true },
        }),
      ]);

      const totalEcommerce = ecommerce._sum.total || 0;
      const totalInStore = inStore._sum.total || 0;

      // Top productos por canal
      const [topInStore, topEcommerce] = await Promise.all([
        this.getTopProducts({ ...dateFilter, saleChannel: "IN_STORE" as any }),
        this.getTopProducts({ ...dateFilter, saleChannel: "ECOMMERCE" as any }),
      ]);

      res.json({
        success: true,
        data: {
          totalEcommerce,
          totalInStore,
          totalGeneral: totalEcommerce + totalInStore,
          orderCountEcommerce: ecommerce._count.id,
          orderCountInStore: inStore._count.id,
          topProductsInStore: topInStore,
          topProductsEcommerce: topEcommerce,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /** Obtiene top 10 productos mas vendidos segun filtro de orden. */
  private async getTopProducts(orderWhere: any): Promise<Array<{ name: string; quantity: number; revenue: number }>> {
    const items = await prisma.orderItem.findMany({
      where: {
        order: { ...orderWhere, status: { not: "CANCELLED" } },
      },
      include: { product: { select: { name: true } } },
    });

    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const item of items) {
      const name = item.product.name;
      const existing = map.get(name) || { name, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.subtotal;
      map.set(name, existing);
    }

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }
}
