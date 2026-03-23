/**
 * Estrategia de pago Bre-B via Wompi.
 *
 * Bre-B es el sistema de pagos instantaneos del Banco de la Republica de Colombia.
 * Wompi actua como intermediario entre el comercio y la red Bre-B, exponiendo
 * un metodo de pago "BANCOLOMBIA_TRANSFER" que redirige al cliente al flujo
 * de autenticacion de su banco para aprobar la transferencia en tiempo real.
 *
 * Flujo de pago:
 *   1. El servidor crea la transaccion en Wompi con createTransaction().
 *   2. Wompi devuelve una URL de pago unica para el cliente.
 *   3. El cliente es redirigido a esa URL para autenticarse con su banco.
 *   4. El banco confirma o rechaza la transferencia.
 *   5. Wompi notifica al servidor via webhook (ver PaymentWebhookController).
 *   6. El servidor actualiza el estado del pedido segun el resultado.
 */

// IPaymentStrategy, PaymentResult - Contrato del patron Strategy de pagos.
import { IPaymentStrategy, PaymentResult } from "../../application/services/PaymentStrategy";

// WompiClient - Cliente HTTP de bajo nivel para la API Wompi.
import { WompiClient } from "./WompiClient";

// env - Para leer WOMPI_CURRENCY y WOMPI_REDIRECT_URL.
import { env } from "../../config/env";

// logger - Para trazabilidad del flujo de pago.
import logger from "../../utils/logger";

export class BrebGateway implements IPaymentStrategy {
  private readonly client: WompiClient;

  constructor() {
    this.client = new WompiClient();
  }

  /**
   * Inicia una transaccion Bre-B en Wompi.
   *
   * El monto se convierte a centavos (amount * 100) porque la API Wompi
   * siempre trabaja en la unidad minima de la moneda (centavos de COP).
   * Enviar el monto en pesos causaria transacciones 100x mas pequenas.
   *
   * @param orderId - UUID del pedido; se usa como `reference` en Wompi.
   *                  Wompi garantiza idempotencia por referencia en una
   *                  ventana de tiempo, lo que previene dobles cobros.
   * @param amount  - Monto en pesos colombianos (no en centavos).
   */
  async pay(orderId: string, amount: number): Promise<PaymentResult> {
    try {
      logger.info("BrebGateway.pay: initiating transaction", { orderId, amount });

      const result = await this.client.createTransaction({
        // Wompi requiere el monto en centavos (pesos * 100).
        amountInCents: Math.round(amount * 100),
        currency: env.wompi.currency,
        // La referencia es el identificador del comercio. Wompi la devuelve
        // en el webhook para correlacionar el evento con el pedido interno.
        reference: orderId,
        redirectUrl: env.wompi.redirectUrl,
        paymentMethod: {
          type: "BANCOLOMBIA_TRANSFER",
        },
      });

      logger.info("BrebGateway.pay: transaction created", {
        orderId,
        transactionId: result.transactionId,
      });

      return {
        success: true,
        gatewayRef: result.transactionId,
        gatewayResponse: result.fullResponse,
        // El mensaje instruye al llamador a redirigir al cliente.
        // El paymentUrl se incluye en gatewayResponse para que el frontend lo use.
        message: `Redirect client to: ${result.paymentUrl}`,
      };
    } catch (err: any) {
      logger.error("BrebGateway.pay: failed to create transaction", {
        orderId,
        error: err?.message,
      });
      return {
        success: false,
        message: err?.message ?? "Failed to initiate Bre-B payment",
        gatewayResponse: err?.body,
      };
    }
  }

  /**
   * Verifica el estado actual de una transaccion Bre-B consultando Wompi.
   *
   * Mapeo de estados Wompi -> PaymentResult:
   * - APPROVED         -> success: true  (pago confirmado, proceder con el pedido)
   * - DECLINED / ERROR -> success: false (pago rechazado, notificar al cliente)
   * - VOIDED           -> success: false (anulado, nada que cobrar)
   * - PENDING          -> success: false / message indica que sigue en proceso
   *
   * @param gatewayRef - UUID de la transaccion en Wompi (devuelto por pay()).
   */
  async verify(gatewayRef: string): Promise<PaymentResult> {
    try {
      const result = await this.client.getTransaction(gatewayRef);

      const approved = result.status === "APPROVED";

      return {
        success: approved,
        gatewayRef,
        gatewayResponse: result.fullResponse,
        message: approved
          ? "Bre-B payment approved"
          : `Bre-B payment not approved: ${result.status}`,
      };
    } catch (err: any) {
      logger.error("BrebGateway.verify: failed to get transaction status", {
        gatewayRef,
        error: err?.message,
      });
      return {
        success: false,
        gatewayRef,
        message: err?.message ?? "Failed to verify Bre-B payment",
        gatewayResponse: err?.body,
      };
    }
  }
}
