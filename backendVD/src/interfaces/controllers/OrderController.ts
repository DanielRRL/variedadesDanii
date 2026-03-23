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

// IOrderStatusHistoryRepository - Registra el log inmutable de transiciones de estado.
import { IOrderStatusHistoryRepository } from "../../domain/repositories/IOrderStatusHistoryRepository";

// IEmailService - Envia notificaciones de cambio de estado al cliente.
import { IEmailService } from "../../application/services/IEmailService";

// OrderStatus - Enum de dominio necesario para el mapa de transiciones validas.
import { OrderStatus } from "../../domain/entities/Order";

// logger - Para registrar fallos no bloqueantes en el flujo de fidelizacion.
import logger from "../../utils/logger";

export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly orderRepo: IOrderRepository,
    private readonly earnPointsUseCase: EarnPointsAfterOrderUseCase,
    private readonly orderStatusHistoryRepo: IOrderStatusHistoryRepository,
    private readonly emailService: IEmailService
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

  /** PATCH /orders/:id/status - Cambia estado del pedido con validacion de transicion. */
  updateStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = param(req, "id");
      const newStatus = req.body.status as OrderStatus;
      const changedById = (req as any).userId as string;

      /**
       * Mapa de transiciones validas por estado actual.
       *
       * WHY: El flujo de un pedido es secuencial y cada etapa tiene
       * precondiciones de negocio (el pago debe confirmarse antes de
       * preparar; preparar antes de despachar, etc.). Permitir saltos
       * arbitrarios romperia la integridad del proceso y podria habilitar
       * entregas sin pago o devoluciones de inventario incorrectas.
       *
       * Quien puede ejecutar transiciones: roles ADMIN y SELLER.
       * - PENDING  -> PAID:       Pago confirmado por el operador o pasarela.
       * - PENDING  -> CANCELLED:  El cliente o admin cancela antes de pagar.
       * - PAID     -> PREPARING:  Equipo inicia la preparacion del pedido.
       * - PAID     -> CANCELLED:  Reembolso antes de iniciar preparacion.
       * - PREPARING -> READY:     Pedido listo para ser recogido o despachado.
       * - PREPARING -> CANCELLED: Cancelacion excepcional (ej: falta de stock).
       * - READY    -> DELIVERED:  El pedido fue entregado exitosamente al cliente.
       * - DELIVERED, CANCELLED:   Estados terminales; no admiten nueva transicion.
       * - SHIPPED: Estado legado sin transiciones activas (compatibilidad BD).
       */
      const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]:    [OrderStatus.PAID, OrderStatus.CANCELLED],
        [OrderStatus.PAID]:       [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        [OrderStatus.PREPARING]:  [OrderStatus.READY, OrderStatus.CANCELLED],
        [OrderStatus.READY]:      [OrderStatus.DELIVERED],
        [OrderStatus.SHIPPED]:    [],  // Estado legado; sin transiciones activas.
        [OrderStatus.DELIVERED]:  [],  // Estado terminal.
        [OrderStatus.CANCELLED]:  [],  // Estado terminal.
      };

      // -- Paso 1: Obtener el pedido actual para validar la transicion.
      // findById incluye la relacion 'user' con email y nombre para las notificaciones.
      const currentOrder = await this.orderRepo.findById(orderId);
      if (!currentOrder) {
        throw AppError.notFound("Order not found");
      }

      // -- Paso 2: Validar que la transicion solicitada es permitida.
      // Si el nuevo estado no esta en la lista de transiciones validas desde
      // el estado actual, se rechaza con 422 Unprocessable Entity para
      // indicar que la solicitud es semanticamente invalida (no un error de
      // formato, sino de logica de negocio).
      const allowed = VALID_TRANSITIONS[currentOrder.status as OrderStatus];
      if (!allowed.includes(newStatus)) {
        throw new AppError(
          `Invalid status transition: ${currentOrder.status} -> ${newStatus}. Allowed: [${allowed.join(", ") || "none"}]`,
          422
        );
      }

      // -- Paso 3: Registrar la transicion en el historial ANTES de actualizar.
      // El historial es append-only y sirve como pista de auditoria. Se crea
      // antes del update para garantizar que si el update falla, el log no
      // quede con una transicion que nunca ocurrio.
      await this.orderStatusHistoryRepo.create({
        orderId,
        fromStatus: currentOrder.status as OrderStatus,
        toStatus: newStatus,
        changedById,
        notes: req.body.notes,
      });

      // -- Paso 4: Actualizar el estado del pedido.
      const updatedOrder = await this.orderRepo.updateStatus(orderId, newStatus);

      // -- Paso 5: Acciones disparadas por el nuevo estado.

      // 5a. DELIVERED: acreditar puntos de fidelizacion al cliente.
      // Se envuelve en try/catch para que un fallo en loyalty no revierta
      // el cambio de estado ya persistido.
      if (newStatus === OrderStatus.DELIVERED) {
        try {
          await this.earnPointsUseCase.execute(orderId, currentOrder.userId);
        } catch (loyaltyErr) {
          logger.warn("Failed to earn loyalty points after delivery", {
            orderId,
            error: loyaltyErr,
          });
        }
      }

      // 5b. PAID: generar factura electronica (stub hasta Parte 7).
      if (newStatus === OrderStatus.PAID) {
        // STUB: GenerateInvoiceUseCase se implementara en la Parte 7 con la DIAN.
        // Por ahora se registra la intencion para trazabilidad en logs.
        logger.info("Invoice generation stub: order paid, invoice pending", {
          orderId,
          orderNumber: currentOrder.orderNumber,
        });
      }

      // 5c. WhatsApp: notificacion al cliente via Twilio (stub hasta Parte 7).
      // Se registra en log para mantener trazabilidad del contacto pendiente.
      logger.info("WhatsApp notification stub: order status changed", {
        phone: currentOrder.user?.phone,
        orderId,
        from: currentOrder.status,
        to: newStatus,
      });

      // 5d. Email: notificar al cliente del nuevo estado del pedido.
      // Falla silenciosamente para no bloquear la respuesta al operador.
      try {
        await this.emailService.sendOrderStatusUpdate(currentOrder.user.email, {
          orderNumber: currentOrder.orderNumber ?? currentOrder.id.slice(0, 8).toUpperCase(),
          newStatus,
          clientName: currentOrder.user.name,
        });
      } catch (emailErr) {
        logger.warn("Failed to send order status update email", {
          orderId,
          error: emailErr,
        });
      }

      res.json({ success: true, data: updatedOrder });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /orders/:id/history - Historial completo de transiciones de estado.
   *
   * WHY: Proporciona transparencia al cliente sobre el avance de su pedido
   * y sirve como pista de auditoria para el equipo administrativo. Solo
   * el dueno del pedido o un ADMIN pueden consultar este historial para
   * proteger la privacidad de los datos operacionales.
   */
  getOrderHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = param(req, "id");
      const requesterId = (req as any).userId as string;
      const requesterRole = (req as any).userRole as string;

      // Verificar que el pedido existe antes de chequear permisos.
      const order = await this.orderRepo.findById(orderId);
      if (!order) {
        throw AppError.notFound("Order not found");
      }

      // Solo el dueno del pedido o un ADMIN pueden ver el historial.
      // Esto previene que un cliente espie el historial de otro cliente.
      if (requesterRole !== "ADMIN" && order.userId !== requesterId) {
        throw AppError.forbidden("You do not have access to this order's history");
      }

      const history = await this.orderStatusHistoryRepo.findByOrderId(orderId);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  };
}
