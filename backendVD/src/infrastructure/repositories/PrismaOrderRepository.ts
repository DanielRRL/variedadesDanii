/**
 * Implementacion del repositorio de ordenes con Prisma.
 * Las consultas incluyen relaciones anidadas (usuario, items -> producto,
 * pago, descuentos) para que la API pueda devolver ordenes completas.
 */

// prisma - Instancia singleton del cliente de base de datos.
import prisma from "../../config/database";

// IOrderRepository - Contrato CRUD + busqueda por usuario.
// CreateOrderData - DTO con la estructura necesaria para crear una orden.
import {
  IOrderRepository,
  CreateOrderData,
} from "../../domain/repositories/IOrderRepository";

export class PrismaOrderRepository implements IOrderRepository {
  /**
   * Obtiene todas las ordenes con relaciones (usuario, items, pago, descuentos).
   * El usuario se proyecta con select para no exponer el hash de la contrasena.
   */
  async findAll(): Promise<any[]> {
    return prisma.order.findMany({
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        items: { include: { product: { include: { essence: true, bottle: true } } } },
        payment: true,
        discounts: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Busca una orden por UUID incluyendo direccion de envio
   * ademas de las relaciones estandar.
   */
  async findById(id: string): Promise<any | null> {
    return prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        address: true,
        items: { include: { product: { include: { essence: true, bottle: true } } } },
        payment: true,
        discounts: true,
      },
    });
  }

  /** Obtiene todas las ordenes de un usuario especifico. */
  async findByUserId(userId: string): Promise<any[]> {
    return prisma.order.findMany({
      where: { userId },
      include: {
        items: { include: { product: { include: { essence: true, bottle: true } } } },
        payment: true,
        discounts: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Crea una orden completa en una sola transaccion implicita de Prisma.
   * Incluye creacion anidada de OrderItems y OrderDiscounts.
   */
  async create(data: CreateOrderData): Promise<any> {
    return prisma.order.create({
      data: {
        userId: data.userId,
        addressId: data.addressId,
        type: data.type as any,
        paymentMethod: data.paymentMethod as any,
        notes: data.notes,
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        // Creacion anidada de items de la orden
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
        // Descuentos opcionales (devolucion frasco, frecuente, volumen)
        discounts: data.discounts
          ? {
              create: data.discounts.map((d) => ({
                type: d.type as any,
                percentage: d.percentage,
                amount: d.amount,
                description: d.description,
              })),
            }
          : undefined,
      },
      include: {
        items: { include: { product: true } },
        payment: true,
        discounts: true,
      },
    });
  }

  /** Actualiza el estado de una orden (PENDING -> CONFIRMED -> SHIPPED, etc.). */
  async updateStatus(id: string, status: string): Promise<any> {
    return prisma.order.update({
      where: { id },
      data: { status: status as any },
      include: {
        items: true,
        payment: true,
      },
    });
  }
}
