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
  OrderFilter,
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
   * Obtiene pedidos paginados con filtros opcionales de canal, estado y rango de fechas.
   */
  async findAllFiltered(filters: OrderFilter): Promise<{ data: any[]; total: number }> {
    const where: any = {};

    if (filters.channel) {
      where.saleChannel = filters.channel;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
          items: { include: { product: { include: { essence: true, bottle: true } } } },
          payment: true,
          discounts: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { data, total };
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
   * Crea una orden con numero legible unico en formato VD-YYYYXXXX.
   *
   * Estrategia de numeracion atomica con secuencia PostgreSQL:
   * Se usa nextval('order_number_seq') en lugar de MAX(orderNumber)+1
   * para evitar la condicion de carrera en la que dos solicitudes
   * concurrentes leen el mismo MAX y generan el mismo numero siguiente.
   * nextval() garantiza unicidad incluso bajo alta concurrencia sin
   * necesidad de transacciones explicitas ni bloqueos a nivel de aplicacion.
   * Los gaps en la secuencia (por rollbacks) son aceptables.
   *
   * Formato: VD-{AÑO}{SEQ con padding de 4 digitos}
   * Ejemplo:  VD-20260001 = primera orden del año 2026.
   */
  async create(data: CreateOrderData): Promise<any> {
    // Obtener el siguiente entero de la secuencia atomicamente.
    // Incluso si la transaccion de la orden falla despues, este valor
    // NO se reutiliza; los gaps en la secuencia son intencionales y seguros.
    const seqResult = await prisma.$queryRaw<[{ val: bigint }]>`SELECT nextval('order_number_seq') as val`;
    const year = new Date().getFullYear();
    const seq = String(Number(seqResult[0].val)).padStart(4, "0");
    const orderNumber = `VD-${year}${seq}`;

    return prisma.order.create({
      data: {
        orderNumber,
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

  /** Actualiza campos arbitrarios de un pedido. */
  async update(id: string, data: Record<string, unknown>): Promise<any> {
    return prisma.order.update({
      where: { id },
      data: data as any,
    });
  }
}
