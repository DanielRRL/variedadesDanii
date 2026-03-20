/**
 * Implementacion del repositorio de devoluciones de frascos con Prisma.
 * Registra cuando un cliente devuelve un frasco para reutilizacion,
 * lo cual genera un descuento del 10% en su proxima compra.
 */

// prisma - Instancia singleton del cliente de base de datos.
import prisma from "../../config/database";

// IBottleReturnRepository - Contrato para operaciones de devolucion.
import { IBottleReturnRepository } from "../../domain/repositories/IBottleReturnRepository";

export class PrismaBottleReturnRepository implements IBottleReturnRepository {
  /**
   * Registra una devolucion de frasco.
   * Incluye datos del usuario y del frasco en la respuesta.
   */
  async create(data: {
    userId: string;
    bottleId: string;
    discountApplied: number;
    notes?: string;
  }): Promise<any> {
    return prisma.bottleReturn.create({
      data: {
        userId: data.userId,
        bottleId: data.bottleId,
        discountApplied: data.discountApplied,
        notes: data.notes,
      },
      include: {
        user: { select: { id: true, name: true } },
        bottle: true,
      },
    });
  }

  /** Historial de devoluciones de un usuario, mas recientes primero. */
  async findByUserId(userId: string): Promise<any[]> {
    return prisma.bottleReturn.findMany({
      where: { userId },
      include: { bottle: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Cuenta devoluciones de un usuario.
   * Se usa para determinar si aplica descuento por devolucion.
   */
  async countByUserId(userId: string): Promise<number> {
    return prisma.bottleReturn.count({ where: { userId } });
  }
}
