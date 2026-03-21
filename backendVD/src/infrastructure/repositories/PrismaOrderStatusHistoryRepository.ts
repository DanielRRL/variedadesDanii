/**
 * Implementacion Prisma del repositorio de Historial de Estado de Pedidos.
 * Traduce las operaciones del contrato IOrderStatusHistoryRepository a
 * consultas Prisma contra la tabla "order_status_history".
 * Los registros son append-only: nunca se actualizan ni eliminan.
 */

// prisma - Instancia singleton de PrismaClient con el adapter pg.
import prisma from "../../config/database";

// IOrderStatusHistoryRepository - Contrato que esta clase implementa.
import { IOrderStatusHistoryRepository } from "../../domain/repositories/IOrderStatusHistoryRepository";

// OrderStatusHistory - Entidad de dominio usada como tipo de retorno.
import { OrderStatusHistory } from "../../domain/entities/OrderStatusHistory";

// OrderStatus - Enum de dominio para tipar los estados.
import { OrderStatus } from "../../domain/entities/Order";

// AppError - Envuelve errores de Prisma en respuestas HTTP controladas.
import { AppError } from "../../utils/AppError";

/** Mapea un registro Prisma a la entidad de dominio OrderStatusHistory. */
function mapRecord(r: any): OrderStatusHistory {
  return new OrderStatusHistory({
    id:          r.id,
    orderId:     r.orderId,
    fromStatus:  r.fromStatus as OrderStatus,
    toStatus:    r.toStatus as OrderStatus,
    changedById: r.changedById,
    notes:       r.notes ?? null,
    createdAt:   r.createdAt,
  });
}

export class PrismaOrderStatusHistoryRepository implements IOrderStatusHistoryRepository {
  /**
   * Crea un registro inmutable de cambio de estado del pedido.
   * Lanza AppError 404 si orderId o changedById no existen (FK violation).
   * Debe llamarse siempre inmediatamente despues de actualizar el Order.
   */
  async create(data: {
    orderId: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    changedById: string;
    notes?: string;
  }): Promise<OrderStatusHistory> {
    try {
      const r = await prisma.orderStatusHistory.create({
        data: {
          orderId:     data.orderId,
          fromStatus:  data.fromStatus,
          toStatus:    data.toStatus,
          changedById: data.changedById,
          notes:       data.notes ?? null,
        },
      });
      return mapRecord(r);
    } catch (err: any) {
      if (err?.code === "P2003") {
        throw AppError.notFound("Pedido o usuario no encontrado al registrar cambio de estado.");
      }
      throw err;
    }
  }

  /**
   * Obtiene todo el historial de cambios de estado de un pedido.
   * Ordena por fechas ascendentes para mostrar la cronologia completa
   * del pedido desde su creacion hasta el estado actual.
   */
  async findByOrderId(orderId: string): Promise<OrderStatusHistory[]> {
    const records = await prisma.orderStatusHistory.findMany({
      where:   { orderId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(mapRecord);
  }
}
