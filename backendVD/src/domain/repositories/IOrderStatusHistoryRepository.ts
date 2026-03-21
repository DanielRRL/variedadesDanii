/**
 * Contrato del repositorio de Historial de Estado de Pedidos
 * (OrderStatusHistory).
 * Define un log append-only de las transiciones de estado.
 * La validacion de transiciones permitidas (PENDING->PAID, etc.)
 * reside en la capa de Application/Services, nunca aqui.
 */

import { OrderStatusHistory } from "../entities/OrderStatusHistory";
import { OrderStatus } from "../entities/Order";

/**
 * Interfaz que deben implementar todos los repositorios de
 * historial de estados de pedido.
 * Toda implementacion concreta reside en infrastructure/repositories/.
 */
export interface IOrderStatusHistoryRepository {
  /**
   * Crea un nuevo registro inmutable de cambio de estado.
   * Debe llamarse siempre que el estado de un pedido cambie,
   * inmediatamente despues de actualizar el Order en BD.
   * @param data.orderId     - UUID del pedido afectado.
   * @param data.fromStatus  - Estado anterior del pedido.
   * @param data.toStatus    - Nuevo estado al que paso el pedido.
   * @param data.changedById - UUID del usuario que realizo el cambio.
   * @param data.notes       - Notas opcionales que justifican el cambio.
   */
  create(data: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    changedById: string;
    notes?: string;
  }): Promise<OrderStatusHistory>;

  /**
   * Obtiene todo el historial de cambios de estado de un pedido.
   * Ordena por fecha ascendente para mostrar la cronologia completa.
   * @param orderId - UUID del pedido cuyo historial se consulta.
   */
  findByOrderId(orderId: string): Promise<OrderStatusHistory[]>;
}
