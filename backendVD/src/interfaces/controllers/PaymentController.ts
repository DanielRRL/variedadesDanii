/**
 * Controlador de pagos.
 * Expone un webhook para recibir confirmaciones de gateways de pago
 * y un endpoint para consultar el pago de una orden.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// IPaymentRepository - Para buscar y actualizar pagos.
import { IPaymentRepository } from "../../domain/repositories/IPaymentRepository";

// IOrderRepository - Para actualizar estado de la orden segun el pago.
import { IOrderRepository } from "../../domain/repositories/IOrderRepository";

// logger - Para registrar confirmaciones y fallos de pago.
import logger from "../../utils/logger";

// param - Helper de Express 5.
import { param } from "../../utils/param";

export class PaymentController {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly orderRepo: IOrderRepository
  ) {}

  /**
   * POST /payments/webhook - Recibe notificacion del gateway de pago.
   * Si status = CONFIRMED -> orden pasa a PAID.
   * Si status = FAILED -> orden pasa a CANCELLED.
   */
  webhook = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { orderId, status, gatewayRef, gatewayResponse } = req.body;

      // Buscar pago existente por orderId
      const payment = await this.paymentRepo.findByOrderId(orderId);
      if (!payment) {
        res.status(404).json({ success: false, message: "Payment not found" });
        return;
      }

      // Actualizar estado del pago
      await this.paymentRepo.updateStatus(payment.id, status, gatewayResponse);

      // Actualizar estado de la orden segun resultado del pago
      if (status === "CONFIRMED") {
        await this.orderRepo.updateStatus(orderId, "PAID");
        logger.info(`Payment confirmed for order ${orderId}`);
      } else if (status === "FAILED") {
        await this.orderRepo.updateStatus(orderId, "CANCELLED");
        logger.warn(`Payment failed for order ${orderId}`);
      }

      res.json({ success: true, message: "Webhook processed" });
    } catch (error) {
      next(error);
    }
  };

  /** GET /payments/order/:orderId - Consulta el pago de una orden. */
  getByOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const payment = await this.paymentRepo.findByOrderId(param(req, "orderId"));
      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  };
}
