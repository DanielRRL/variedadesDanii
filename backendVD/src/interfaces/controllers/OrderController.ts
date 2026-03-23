/**
 * Controlador de ordenes.
 * Delega la creacion al CreateOrderUseCase y las consultas al repo directo.
 * El userId se extrae del JWT decodificado (req.userId).
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// CreateOrderUseCase - Caso de uso que orquesta la creacion completa.
import { CreateOrderUseCase } from "../../application/usecases/CreateOrderUseCase";

// IOrderRepository - Para consultas de lectura de ordenes.
import { IOrderRepository } from "../../domain/repositories/IOrderRepository";

// AppError - Para lanzar 404 si la orden no existe.
import { AppError } from "../../utils/AppError";

// param - Helper de Express 5 para extraer params.
import { param } from "../../utils/param";

// EarnPointsAfterOrderUseCase - Acredita puntos al marcar una orden como entregada.
import { EarnPointsAfterOrderUseCase } from "../../application/usecases/EarnPointsAfterOrderUseCase";

// logger - Para registrar fallos no bloqueantes en el flujo de fidelizacion.
import logger from "../../utils/logger";

export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly orderRepo: IOrderRepository,
    private readonly earnPointsUseCase: EarnPointsAfterOrderUseCase
  ) {}

  /** POST /orders - Crea una orden (userId viene del JWT en el middleware). */
  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // userId viene del authMiddleware que decodifico el JWT
      const userId = (req as any).userId;
      const result = await this.createOrderUseCase.execute({
        userId,
        addressId: req.body.addressId,
        type: req.body.type || "ONLINE",
        paymentMethod: req.body.paymentMethod,
        notes: req.body.notes,
        isBottleReturn: req.body.isBottleReturn || false,
        products: req.body.products,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  /** GET /orders - Lista todas las ordenes (admin). */
  getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orders = await this.orderRepo.findAll();
      res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  };

  /** GET /orders/:id - Detalle de una orden con relaciones. */
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const order = await this.orderRepo.findById(param(req, "id"));
      if (!order) {
        throw AppError.notFound("Order not found");
      }
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  };

  /** GET /orders/user/:userId - Ordenes de un usuario especifico. */
  getByUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Si no hay param userId, usar el del JWT
      const userId =
        param(req, "userId") || (req as any).userId;
      const orders = await this.orderRepo.findByUserId(userId);
      res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  };

  /** PATCH /orders/:id/status - Cambia estado (admin: CONFIRMED, SHIPPED, etc.). */
  updateStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const order = await this.orderRepo.updateStatus(
        param(req, "id"),
        req.body.status
      );
      // Acreditar puntos cuando la orden llega a estado DELIVERED
      if (req.body.status === "DELIVERED") {
        try {
          await this.earnPointsUseCase.execute(order.id, order.userId);
        } catch (loyaltyErr) {
          logger.warn("Failed to earn loyalty points after delivery", {
            orderId: order.id,
            error: loyaltyErr,
          });
        }
      }
      res.json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  };
}
