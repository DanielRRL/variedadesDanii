/**
 * Interface del repositorio de Pagos.
 * Define operaciones para registrar y consultar pagos asociados a pedidos.
 * Cada pedido tiene un unico pago (relacion 1:1 via orderId unique).
 */

/** Contrato del repositorio de pagos. */
export interface IPaymentRepository {
  /** Crea un registro de pago asociado a un pedido. */
  create(data: {
    orderId: string;        // FK al pedido.
    method: string;         // Metodo: NEQUI, DAVIPLATA, BANCOLOMBIA, CASH.
    status: string;         // Estado: PENDING, CONFIRMED, FAILED, REFUNDED.
    amount: number;         // Monto total a pagar.
    gatewayRef?: string;    // Referencia del gateway de pago.
    gatewayResponse?: any;  // Respuesta completa del gateway (JSON).
  }): Promise<any>;

  /** Busca el pago asociado a un pedido. */
  findByOrderId(orderId: string): Promise<any | null>;

  /** Actualiza el estado de un pago (ej: PENDING -> CONFIRMED). */
  updateStatus(id: string, status: string, gatewayResponse?: any): Promise<any>;
}
