/**
 * Entidad de dominio: Pedido (Order).
 * Representa una compra realizada por un cliente.
 * Contiene items (productos), descuentos aplicados y metodo de pago.
 * El flujo de estados es: PENDING -> PAID -> PREPARING -> SHIPPED -> DELIVERED.
 * Un pedido puede cancelarse si esta en PENDING o PAID.
 */

/**
 * Estados posibles de un pedido.
 * El avance es secuencial, excepto CANCELLED que puede ocurrir
 * desde PENDING o PAID.
 */
export enum OrderStatus {
  PENDING = "PENDING",       // Recien creado, esperando pago.
  PAID = "PAID",             // Pago confirmado.
  PREPARING = "PREPARING",   // En preparacion (llenado de frascos).
  READY = "READY",           // Pedido listo para despacho o recogida.
  SHIPPED = "SHIPPED",       // Enviado (legado; sin transiciones activas).
  DELIVERED = "DELIVERED",   // Entregado exitosamente al cliente.
  CANCELLED = "CANCELLED",   // Cancelado antes de preparar.
}

/**
 * Tipos de pedido.
 * - ONLINE: compra por la tienda web, envio a domicilio.
 * - REFILL: recarga de frasco devuelto con descuento.
 * - CASH_ON_DELIVERY: pago contra entrega.
 */
export enum OrderType {
  ONLINE = "ONLINE",
  REFILL = "REFILL",
  CASH_ON_DELIVERY = "CASH_ON_DELIVERY",
}

/**
 * Metodos de pago aceptados en Colombia.
 * Cada uno tiene su estrategia de procesamiento (Strategy Pattern).
 */
export enum PaymentMethod {
  NEQUI = "NEQUI",
  DAVIPLATA = "DAVIPLATA",
  BANCOLOMBIA = "BANCOLOMBIA",
  CASH = "CASH",
}

/** Datos de un item dentro de un pedido. */
export interface OrderItemData {
  productId: string; // FK al producto comprado.
  quantity: number;  // Cantidad de unidades.
  unitPrice: number; // Precio unitario al momento de la compra.
  subtotal: number;  // quantity * unitPrice.
}

/** Propiedades necesarias para construir un Pedido. */
export interface OrderProps {
  id?: string;
  userId: string;           // FK al cliente que realiza el pedido.
  addressId?: string;       // FK a la direccion de envio (opcional).
  type: OrderType;          // Tipo de pedido.
  status: OrderStatus;      // Estado actual.
  subtotal: number;         // Suma de subtotales de items (antes de descuentos).
  discount: number;         // Total de descuentos aplicados.
  total: number;            // subtotal - discount.
  paymentMethod: PaymentMethod; // Metodo de pago elegido.
  notes?: string;           // Notas adicionales del cliente.
  items: OrderItemData[];   // Lista de productos en el pedido.
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Clase de dominio Order.
 * Valida que todo pedido tenga al menos un item.
 * Ofrece metodos para consultar el estado del pedido.
 */
export class Order {
  public readonly id?: string;
  public userId: string;
  public addressId?: string;
  public type: OrderType;
  public status: OrderStatus;
  public subtotal: number;
  public discount: number;
  public total: number;
  public paymentMethod: PaymentMethod;
  public notes?: string;
  public items: OrderItemData[];
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  /**
   * Construye la entidad validando que tenga al menos un item.
   * @throws Error si el arreglo de items esta vacio.
   */
  constructor(props: OrderProps) {
    if (props.items.length === 0) {
      throw new Error("Order must have at least one item");
    }

    this.id = props.id;
    this.userId = props.userId;
    this.addressId = props.addressId;
    this.type = props.type;
    this.status = props.status;
    this.subtotal = props.subtotal;
    this.discount = props.discount;
    this.total = props.total;
    this.paymentMethod = props.paymentMethod;
    this.notes = props.notes;
    this.items = props.items;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** Un pedido solo se puede cancelar si aun no fue preparado. */
  canBeCancelled(): boolean {
    return (
      this.status === OrderStatus.PENDING || this.status === OrderStatus.PAID
    );
  }

  /** Verifica si el pedido ya paso del estado PENDING (ya tiene pago). */
  isPaid(): boolean {
    return this.status !== OrderStatus.PENDING;
  }
}
