/**
 * Entidad de dominio: Historial de Estado de Pedido (OrderStatusHistory).
 * Registro inmutable de cada transicion de estado para auditoria.
 * Una vez creado nunca debe modificarse; represents an append-only log.
 */

import { OrderStatus } from "./Order";
export { OrderStatus };

/** Propiedades para construir un registro de historial de estado. */
export interface OrderStatusHistoryProps {
  id?: string;
  orderId: string;          // FK al pedido que cambio de estado.
  fromStatus: OrderStatus;  // Estado anterior.
  toStatus: OrderStatus;    // Nuevo estado.
  changedById: string;      // FK al usuario que ejecuto el cambio.
  notes?: string | null;    // Justificacion opcional del cambio.
  createdAt?: Date;
}

/** Entidad de dominio OrderStatusHistory. */
export class OrderStatusHistory {
  public readonly id?: string;
  public orderId: string;
  public fromStatus: OrderStatus;
  public toStatus: OrderStatus;
  public changedById: string;
  public notes?: string | null;
  public readonly createdAt?: Date;

  constructor(props: OrderStatusHistoryProps) {
    this.id          = props.id;
    this.orderId     = props.orderId;
    this.fromStatus  = props.fromStatus;
    this.toStatus    = props.toStatus;
    this.changedById = props.changedById;
    this.notes       = props.notes;
    this.createdAt   = props.createdAt;
  }
}
