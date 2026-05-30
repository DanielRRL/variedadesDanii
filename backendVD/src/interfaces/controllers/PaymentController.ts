/**
 * Controlador de pagos.
 * Expone endpoints de consulta de pagos por orden.
 *
 * IMPORTANTE: No se expone webhook de pago aqui.
 * El unico webhook valido es /api/webhooks/wompi manejado por
 * PaymentWebhookController con validacion HMAC-SHA256 obligatoria.
 *
 * Seguridad: todo endpoint verifica que el usuario autenticado sea
 * el dueno del recurso o un ADMIN.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// IPaymentRepository - Para buscar pagos.
import { IPaymentRepository } from "../../domain/repositories/IPaymentRepository";

// IOrderRepository - Para verificar ownership del pago.
import { IOrderRepository } from "../../domain/repositories/IOrderRepository";

// AppError - Para lanzar 403 si el usuario no tiene acceso.
import { AppError } from "../../utils/AppError";

// param - Helper de Express 5.
import { param } from "../../utils/param";

export class PaymentController {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly orderRepo: IOrderRepository,
  ) {}

  /** GET /payments/order/:orderId - Consulta el pago de una orden. Solo el dueno o ADMIN. */
  getByOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = param(req, "orderId");
      const requesterId = req.userId!;
      const requesterRole = req.userRole ?? "";

      if (requesterRole !== "ADMIN") {
        const order = await this.orderRepo.findById(orderId);
        if (!order || order.userId !== requesterId) {
          throw AppError.forbidden("You can only view payments for your own orders.");
        }
      }

      const payment = await this.paymentRepo.findByOrderId(orderId);
      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  };
}
