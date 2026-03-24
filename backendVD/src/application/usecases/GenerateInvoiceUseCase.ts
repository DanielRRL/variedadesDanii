/**
 * GenerateInvoiceUseCase — Caso de uso: generar factura electronica para una orden.
 *
 * Patron Fire-and-Forget:
 *   Este caso de uso NUNCA relanza excepciones. Captura cualquier error
 *   internamente para garantizar que un fallo en facturacion no afecte
 *   el flujo principal del pago ni la actualizacion de estado de la orden.
 *
 * Si el envio falla:
 *   - Se registra el error en los logs para alerta del equipo.
 *   - La factura queda en estado DRAFT en la BD.
 *   - El admin puede reintentar con POST /api/admin/invoices/:orderId/retry.
 *
 * Uso:
 *   Se invoca desde PaymentWebhookController cuando Wompi confirma APPROVED.
 *   Tambien puede invocarse desde cualquier otro trigger (ej: entrega manual).
 */

import { InvoiceService } from "../services/InvoiceService";
import { ElectronicInvoice } from "../../domain/entities/ElectronicInvoice";
import logger from "../../utils/logger";

export class GenerateInvoiceUseCase {
  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * Ejecuta la generacion de factura para la orden indicada.
   *
   * @param orderId - UUID de la orden a facturar.
   * @returns La factura generada, o undefined si hubo un error (fire-and-forget).
   */
  async execute(orderId: string): Promise<ElectronicInvoice | undefined> {
    try {
      return await this.invoiceService.generateForOrder(orderId);
    } catch (err: any) {
      // Nunca relanzar: un fallo en facturacion no debe:
      //   - Cancelar un pago confirmado.
      //   - Revertir el estado PAID de la orden.
      //   - Hacer que Wompi reintente el webhook por error 5xx.
      //
      // Se loguea con nivel ERROR para que el equipo pueda actuar
      // y usar el endpoint de reintento desde el panel admin.
      logger.error("GenerateInvoiceUseCase: fallo al generar factura", {
        orderId,
        error: err?.message,
        stack: err?.stack,
      });
      return undefined;
    }
  }
}
