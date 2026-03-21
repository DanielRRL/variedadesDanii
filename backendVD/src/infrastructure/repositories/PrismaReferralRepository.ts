/**
 * Implementacion Prisma del repositorio de Codigos de Referido.
 * Traduce las operaciones del contrato IReferralRepository a consultas
 * Prisma contra las tablas "referral_codes" y "referral_usages".
 */

// prisma - Instancia singleton de PrismaClient con el adapter pg.
import prisma from "../../config/database";

// IReferralRepository - Contrato que esta clase implementa.
import { IReferralRepository } from "../../domain/repositories/IReferralRepository";

// Entidades de dominio usadas como tipos de entrada/salida.
import { ReferralCode } from "../../domain/entities/ReferralCode";
import { ReferralUsage } from "../../domain/entities/ReferralUsage";

// AppError - Envuelve errores de Prisma en respuestas HTTP controladas.
import { AppError } from "../../utils/AppError";

/** Mapea un registro Prisma a la entidad de dominio ReferralCode. */
function mapCode(r: any): ReferralCode {
  return new ReferralCode({
    id:         r.id,
    userId:     r.userId,
    code:       r.code,
    usageCount: r.usageCount,
    createdAt:  r.createdAt,
  });
}

/** Mapea un registro Prisma a la entidad de dominio ReferralUsage. */
function mapUsage(r: any): ReferralUsage {
  return new ReferralUsage({
    id:             r.id,
    referralCodeId: r.referralCodeId,
    newUserId:      r.newUserId,
    rewardGiven:    r.rewardGiven,
    createdAt:      r.createdAt,
  });
}

export class PrismaReferralRepository implements IReferralRepository {
  /**
   * Busca el codigo de referido propio de un usuario.
   * Usa el indice @unique en userId para busqueda O(1).
   * Retorna null si el usuario aun no tiene codigo generado.
   */
  async findCodeByUserId(userId: string): Promise<ReferralCode | null> {
    const r = await prisma.referralCode.findUnique({ where: { userId } });
    return r ? mapCode(r) : null;
  }

  /**
   * Busca un codigo de referido por su cadena alfanumerica.
   * Usa el indice @unique en code para busqueda O(1).
   * Retorna null si la cadena no existe en la tabla.
   */
  async findCodeByCode(code: string): Promise<ReferralCode | null> {
    const r = await prisma.referralCode.findUnique({ where: { code } });
    return r ? mapCode(r) : null;
  }

  /**
   * Crea un nuevo codigo de referido.
   * Lanza AppError 409 si ya existe un codigo con ese valor o
   * si el usuario ya tiene un codigo asignado (ambos @unique).
   */
  async createCode(data: { userId: string; code: string }): Promise<ReferralCode> {
    try {
      const r = await prisma.referralCode.create({
        data: { userId: data.userId, code: data.code },
      });
      return mapCode(r);
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw AppError.conflict("El codigo de referido ya existe o el usuario ya tiene uno.");
      }
      throw err;
    }
  }

  /**
   * Incrementa en 1 el contador de usos del codigo usando operacion atomica.
   * Usa increment de Prisma para evitar race conditions en entornos concurrentes.
   * Lanza AppError 404 si el codigo no existe.
   */
  async incrementUsageCount(id: string): Promise<void> {
    try {
      await prisma.referralCode.update({
        where: { id },
        data:  { usageCount: { increment: 1 } },
      });
    } catch (err: any) {
      if (err?.code === "P2025") {
        throw AppError.notFound("Codigo de referido no encontrado.");
      }
      throw err;
    }
  }

  /**
   * Registra que un nuevo usuario utilizo el codigo de referido.
   * Se crea con rewardGiven=false; el servicio lo actualiza con markRewardGiven.
   * Lanza AppError 404 si el codigo o el usuario no existen (FK violation).
   */
  async createUsage(data: { referralCodeId: string; newUserId: string }): Promise<ReferralUsage> {
    try {
      const r = await prisma.referralUsage.create({
        data: {
          referralCodeId: data.referralCodeId,
          newUserId:      data.newUserId,
        },
      });
      return mapUsage(r);
    } catch (err: any) {
      if (err?.code === "P2003") {
        throw AppError.notFound("Codigo de referido o usuario no encontrado.");
      }
      throw err;
    }
  }

  /**
   * Marca el uso del codigo como recompensado (rewardGiven=true).
   * Se llama una sola vez despues de acreditar los puntos al referidor.
   * Lanza AppError 404 si el uso no existe.
   */
  async markRewardGiven(usageId: string): Promise<void> {
    try {
      await prisma.referralUsage.update({
        where: { id: usageId },
        data:  { rewardGiven: true },
      });
    } catch (err: any) {
      if (err?.code === "P2025") {
        throw AppError.notFound("Registro de uso de referido no encontrado.");
      }
      throw err;
    }
  }
}
