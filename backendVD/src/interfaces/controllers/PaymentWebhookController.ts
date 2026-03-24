/**
 * Controlador de webhooks de Wompi.
 *
 * Wompi envia un evento HTTP POST a esta URL cada vez que el estado de una
 * transaccion cambia (APPROVED, DECLINED, VOIDED, etc.). Este controlador:
 *
 * 1. Valida la firma HMAC-SHA256 para autenticar que el evento es genuino.
 * 2. Actualiza el estado del pago en la base de datos.
 * 3. Actualiza el estado de la orden segun el resultado del pago.
 * 4. Dispara acciones encadenadas (factura electronica stub).
 *
 * Politica de respuesta:
 * - SIEMPRE responder 200 si la firma es valida, aunque la logica interna
 *   falle. Wompi reintentara el evento varias veces si recibe un codigo
 *   distinto de 2xx, lo que podria causar procesamiento duplicado.
 * - Responder 401 si la firma es invalida, SIN revelar el motivo detallado.
 *
 * Idempotencia: si Wompi reintenta un evento ya procesado, el sistema debe
 * manejar el caso de forma segura. findByOrderId + updateStatus son
 * idempotentes por diseno (actualizar al mismo estado no causa inconsistencia).
 */

// Request, Response - Tipos base de Express.
import { Request, Response } from "express";

// WebhookValidator - Valida la firma HMAC-SHA256 del evento Wompi.
import { WebhookValidator } from "../../infrastructure/payment-gateways/WebhookValidator";

// IPaymentRepository - Para actualizar el estado del pago en BD.
import { IPaymentRepository } from "../../domain/repositories/IPaymentRepository";

// IOrderRepository - Para avanzar el estado de la orden a PAID o CANCELLED.
import { IOrderRepository } from "../../domain/repositories/IOrderRepository";

// GenerateInvoiceUseCase - Dispara la generacion de factura electronica tras pago aprobado.
import { GenerateInvoiceUseCase } from "../../application/usecases/GenerateInvoiceUseCase";

// logger - Para auditoria y alertas operacionales.
import logger from "../../utils/logger";

export class PaymentWebhookController {
  private readonly validator: WebhookValidator;

  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly orderRepo: IOrderRepository,
    private readonly generateInvoiceUseCase: GenerateInvoiceUseCase,
  ) {
    this.validator = new WebhookValidator();
  }

  /**
   * POST /api/webhooks/wompi
   *
   * Recibe y procesa eventos de transaccion de Wompi.
   * El body llega como Buffer (express.raw) para que la firma del payload
   * no se altere por el parseo JSON (el orden de claves podria cambiar).
   */
  handleWompiWebhook = async (req: Request, res: Response): Promise<void> => {
    // ---------------------------------------------------------------------------
    // Paso 1: Extraer y validar la firma del header.
    //
    // WHY: Cualquier agente externo podria enviar POST a esta URL con datos
    // falsos (ej: fingir que un pago fue aprobado sin haber pagado nada).
    // La firma HMAC-SHA256 garantiza que solo Wompi, quien conoce el secreto,
    // pudo generar ese hash para ese payload exacto.
    // ---------------------------------------------------------------------------
    const signature = req.headers["x-wc-signature"] as string | undefined;
    const timestamp  = req.headers["x-wc-timestamp"]  as string | undefined;

    // El body ya es un Buffer (express.raw en la ruta). Lo convertimos a string
    // con la misma codificacion que Wompi usa para calcular su firma.
    const rawBody = req.body instanceof Buffer
      ? req.body.toString("utf8")
      : JSON.stringify(req.body);

    if (!signature || !timestamp) {
      // Headers de firma ausentes: rechazar silenciosamente.
      // No revelar que los headers faltan (ayudaria a un atacante a ajustar su
      // solicitud). Simplemente devolver 401.
      logger.warn("PaymentWebhookController: missing signature headers", {
        ip: req.ip,
      });
      res.status(401).json({ success: false });
      return;
    }

    const isValid = this.validator.validateWompiSignature(rawBody, timestamp, signature);

    if (!isValid) {
      // Firma invalida: posible intento de spoofing o evento corrupto.
      // Loguear para alerta del equipo de seguridad, pero NO revelar el
      // motivo en la respuesta HTTP.
      logger.warn("PaymentWebhookController: invalid webhook signature", {
        ip: req.ip,
        timestamp,
      });
      res.status(401).json({ success: false });
      return;
    }

    // ---------------------------------------------------------------------------
    // Paso 2: Parsear el evento.
    //
    // El payload es JSON; lo parseamos aqui (despues de validar la firma)
    // para evitar trabajo innecesario si la firma era invalida.
    // ---------------------------------------------------------------------------
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      // Body no es JSON valido: no deberia ocurrir si la firma es valida,
      // pero lo manejamos defensivamente.
      logger.error("PaymentWebhookController: failed to parse webhook body");
      // Devolvemos 200 para que Wompi no reintente un evento malformado
      // que nunca podremos procesar correctamente.
      res.status(200).json({ success: false, message: "Unparseable body" });
      return;
    }

    // ---------------------------------------------------------------------------
    // Paso 3: Procesar el evento segun el tipo.
    //
    // Wompi envia distintos tipos de eventos (transaction.updated,
    // payment_link.paid, etc.). Nos interesan los cambios de estado de
    // transaccion que afectan el flujo de pedidos.
    // ---------------------------------------------------------------------------
    const transaction = event?.data?.transaction;

    if (!transaction) {
      // Evento sin datos de transaccion (ej: eventos de payment_link).
      // Ignoramos pero confirmamos recepcion con 200 para que Wompi no reintente.
      logger.info("PaymentWebhookController: event without transaction data", {
        eventType: event?.event,
      });
      res.status(200).json({ success: true, message: "Event acknowledged" });
      return;
    }

    const wompiStatus: string = transaction.status;
    // La referencia es el orderId que enviamos al crear la transaccion.
    const orderId: string = transaction.reference;
    const transactionId: string = transaction.id;

    logger.info("PaymentWebhookController: processing transaction event", {
      orderId,
      transactionId,
      wompiStatus,
    });

    try {
      // Buscar el pago interno por orderId para obtener su UUID.
      const payment = await this.paymentRepo.findByOrderId(orderId);

      if (!payment) {
        // El pago no existe en nuestra BD: posible evento duplicado despues
        // de una limpieza, o referencia desconocida. Confirmar 200 para que
        // Wompi no reintente indefinidamente.
        logger.warn("PaymentWebhookController: payment not found for order", {
          orderId,
          transactionId,
        });
        res.status(200).json({ success: true, message: "Order not found, acknowledged" });
        return;
      }

      if (wompiStatus === "APPROVED") {
        // ---------------------------------------------------------------------------
        // Pago aprobado: confirmar el pago y avanzar la orden a PAID.
        //
        // WHY el orden importa: actualizar el pago primero garantiza que si
        // la actualizacion de la orden falla, tengamos trazabilidad del pago.
        // Un pago CONFIRMED con orden en PENDING es recoverable; lo inverso no.
        // ---------------------------------------------------------------------------
        await this.paymentRepo.updateStatus(payment.id, "CONFIRMED", transaction);
        await this.orderRepo.updateStatus(orderId, "PAID");

        logger.info("PaymentWebhookController: payment approved, order marked PAID", {
          orderId,
          transactionId,
        });

        // Disparar la generacion de factura electronica (fire-and-forget).
        // GenerateInvoiceUseCase captura internamente cualquier error para que
        // un fallo en facturacion nunca afecte la respuesta 200 a Wompi.
        void this.generateInvoiceUseCase.execute(orderId);

      } else if (wompiStatus === "DECLINED" || wompiStatus === "VOIDED" || wompiStatus === "ERROR") {
        // ---------------------------------------------------------------------------
        // Pago rechazado/anulado: marcar como fallido y dejar la orden en PENDING
        // (no en CANCELLED, ya que el cliente podria intentar pagar de nuevo).
        //
        // Se registra para revision del equipo de administracion.
        // ---------------------------------------------------------------------------
        await this.paymentRepo.updateStatus(payment.id, "FAILED", transaction);

        logger.warn("PaymentWebhookController: payment not approved", {
          orderId,
          transactionId,
          wompiStatus,
          reason: transaction.status_message,
        });

      } else {
        // Estado intermedio (PENDING, etc.): Wompi enviara otro evento cuando
        // el estado sea final. Solo lo registramos.
        logger.info("PaymentWebhookController: intermediate status, no action taken", {
          orderId,
          wompiStatus,
        });
      }
    } catch (err: any) {
      // Error interno al procesar el evento. Loguear para alerta, pero devolver
      // 200 de todas formas para evitar que Wompi reintente indefinidamente
      // un evento que podria causar efectos secundarios no idempotentes.
      logger.error("PaymentWebhookController: error processing event", {
        orderId,
        transactionId,
        error: err?.message,
      });
    }

    // ---------------------------------------------------------------------------
    // Paso 4: Siempre responder 200 a Wompi.
    //
    // WHY: si respondemos con 4xx/5xx, Wompi reintentara el evento hasta 10 veces
    // en un periodo de horas. Si nuestro codigo tiene un bug que causa error para
    // un evento especifico, el reintento no lo resolvera y solo generara ruido.
    // Preferimos loguear el error y confirmar recepcion.
    // ---------------------------------------------------------------------------
    res.status(200).json({ success: true });
  };
}
