/**
 * Interface del repositorio de Pedidos.
 * Define operaciones para crear, consultar y actualizar pedidos.
 * Los metodos retornan any porque incluyen datos anidados de Prisma
 * (usuario, items con producto, pago, descuentos) que no mapean
 * directamente a la entidad Order de dominio.
 */

// Order - Entidad de dominio (importada para referencia de tipos).
import { Order } from "../entities/Order";

/**
 * Datos necesarios para crear un pedido nuevo.
 * Se definen por separado para desacoplar la estructura de la BD
 * de la entidad de dominio.
 */
export interface CreateOrderData {
  userId: string;        // Cliente que realiza la compra.
  addressId?: string;    // Direccion de envio (opcional para contra-entrega).
  type: string;          // Tipo: ONLINE, REFILL, CASH_ON_DELIVERY.
  paymentMethod: string; // Metodo de pago elegido.
  notes?: string;        // Notas adicionales.
  subtotal: number;      // Suma antes de descuentos.
  discount: number;      // Total de descuento aplicado.
  total: number;         // Monto final a pagar.
  items: Array<{         // Productos del pedido.
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  discounts?: Array<{    // Descuentos aplicados (devolucion, frecuente, volumen).
    type: string;
    percentage: number;
    amount: number;
    description?: string;
  }>;
}

/** Filtros opcionales para listar pedidos (admin). */
export interface OrderFilter {
  channel?: string;
  status?: string;
  from?: string;   // ISO date
  to?: string;     // ISO date
  page?: number;
  limit?: number;
}

/** Contrato del repositorio de pedidos. */
export interface IOrderRepository {
  /** Obtiene todos los pedidos con usuario, items, pago y descuentos. */
  findAll(): Promise<any[]>;

  /** Obtiene pedidos paginados con filtros opcionales. */
  findAllFiltered(filters: OrderFilter): Promise<{ data: any[]; total: number }>;

  /** Busca un pedido por UUID con todas sus relaciones. */
  findById(id: string): Promise<any | null>;

  /** Obtiene todos los pedidos de un usuario especifico. */
  findByUserId(userId: string): Promise<any[]>;

  /** Crea un pedido con items y descuentos en una transaccion. */
  create(data: CreateOrderData): Promise<any>;

  /** Actualiza el estado de un pedido (PENDING -> PAID -> etc). */
  updateStatus(id: string, status: string): Promise<any>;

  /** Actualiza campos arbitrarios de un pedido. */
  update(id: string, data: Record<string, unknown>): Promise<any>;
}
