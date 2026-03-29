/**
 * Implementacion Prisma del repositorio de Canjes de Esencia.
 * Traduce las operaciones del contrato IEssenceRedemptionRepository a consultas
 * Prisma contra la tabla "essence_redemptions".
 */

// prisma - Instancia singleton de PrismaClient con el adapter pg.
import prisma from "../../config/database";

// IEssenceRedemptionRepository - Contrato que esta clase implementa.
import { IEssenceRedemptionRepository } from "../../domain/repositories/IEssenceRedemptionRepository";

// Entidades de dominio usadas como tipos de entrada/salida.
import { EssenceRedemption, EssenceRedemptionStatus } from "../../domain/entities/EssenceRedemption";

// AppError - Envuelve errores de Prisma en respuestas HTTP controladas.
import { AppError } from "../../utils/AppError";

/** Mapea un registro de Prisma a la entidad de dominio EssenceRedemption. */
function mapRedemption(r: any): EssenceRedemption {
  return new EssenceRedemption({
    id:            r.id,
    userId:        r.userId,
    gramsUsed:     r.gramsUsed,
    ozRedeemed:    r.ozRedeemed,
    essenceName:   r.essenceName,
    essenceId:     r.essenceId,
    status:        r.status as EssenceRedemptionStatus,
    adminNotes:    r.adminNotes,
    deliveredById: r.deliveredById,
    deliveredAt:   r.deliveredAt,
    createdAt:     r.createdAt,
  });
}

export class PrismaEssenceRedemptionRepository implements IEssenceRedemptionRepository {
  /**
   * Crea un nuevo registro de canje con estado PENDING_DELIVERY.
   */
  async create(data: {
    userId: string;
    gramsUsed: number;
    ozRedeemed: number;
    essenceName: string;
    essenceId?: string;
  }): Promise<EssenceRedemption> {
    const r = await prisma.essenceRedemption.create({
      data: {
        userId:      data.userId,
        gramsUsed:   data.gramsUsed,
        ozRedeemed:  data.ozRedeemed,
        essenceName: data.essenceName,
        essenceId:   data.essenceId ?? null,
      },
    });
    return mapRedemption(r);
  }

  /**
   * Lista los canjes PENDING_DELIVERY paginados para el panel admin.
   * Incluye datos del usuario para la vista de entregas pendientes.
   */
  async findPendingDeliveries(
    page: number,
    limit: number
  ): Promise<{ redemptions: EssenceRedemption[]; total: number }> {
    const [records, total] = await Promise.all([
      prisma.essenceRedemption.findMany({
        where:   { status: "PENDING_DELIVERY" },
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.essenceRedemption.count({ where: { status: "PENDING_DELIVERY" } }),
    ]);
    return {
      redemptions: records.map(mapRedemption),
      total,
    };
  }

  /**
   * Marca un canje como DELIVERED por un admin.
   * Registra el ID del admin, las notas y la fecha de entrega.
   * Lanza AppError 404 si el canje no existe.
   * Lanza AppError 409 si el canje no esta en estado PENDING_DELIVERY.
   */
  async markDelivered(
    redemptionId: string,
    adminId: string,
    notes?: string
  ): Promise<EssenceRedemption> {
    // Verificar que existe y esta en estado correcto
    const existing = await prisma.essenceRedemption.findUnique({
      where: { id: redemptionId },
    });
    if (!existing) {
      throw AppError.notFound("Canje de esencia no encontrado.");
    }
    if (existing.status !== "PENDING_DELIVERY") {
      throw AppError.conflict(`No se puede entregar un canje en estado ${existing.status}.`);
    }

    const r = await prisma.essenceRedemption.update({
      where: { id: redemptionId },
      data: {
        status:        "DELIVERED",
        deliveredById: adminId,
        adminNotes:    notes ?? null,
        deliveredAt:   new Date(),
      },
    });
    return mapRedemption(r);
  }

  /**
   * Obtiene todos los canjes de un usuario, ordenados por fecha descendente.
   */
  async findByUser(userId: string): Promise<EssenceRedemption[]> {
    const records = await prisma.essenceRedemption.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(mapRedemption);
  }

  /**
   * Cancela un canje y cambia su estado a CANCELLED.
   * La reversion de gramos la maneja el servicio que invoca este metodo.
   * Lanza AppError 404 si el canje no existe.
   * Lanza AppError 409 si el canje no esta en estado PENDING_DELIVERY.
   */
  async cancelRedemption(
    redemptionId: string,
    adminId: string
  ): Promise<EssenceRedemption> {
    const existing = await prisma.essenceRedemption.findUnique({
      where: { id: redemptionId },
    });
    if (!existing) {
      throw AppError.notFound("Canje de esencia no encontrado.");
    }
    if (existing.status !== "PENDING_DELIVERY") {
      throw AppError.conflict(`No se puede cancelar un canje en estado ${existing.status}.`);
    }

    const r = await prisma.essenceRedemption.update({
      where: { id: redemptionId },
      data: {
        status:        "CANCELLED",
        deliveredById: adminId,
        adminNotes:    `Cancelado por admin ${adminId}`,
      },
    });
    return mapRedemption(r);
  }
}
