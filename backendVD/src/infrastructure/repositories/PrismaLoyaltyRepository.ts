/**
 * Implementacion Prisma del repositorio de Fidelizacion.
 * Traduce las operaciones del contrato ILoyaltyRepository a consultas
 * Prisma contra las tablas "loyalty_accounts" y "loyalty_transactions".
 */

// prisma - Instancia singleton de PrismaClient con el adapter pg.
import prisma from "../../config/database";

// ILoyaltyRepository - Contrato que esta clase implementa.
import { ILoyaltyRepository } from "../../domain/repositories/ILoyaltyRepository";

// Entidades de dominio usadas como tipos de entrada/salida.
import { LoyaltyAccount, LoyaltyLevel } from "../../domain/entities/LoyaltyAccount";
import { LoyaltyTransaction, LoyaltyTxType } from "../../domain/entities/LoyaltyTransaction";

// AppError - Envuelve errores de Prisma en respuestas HTTP controladas.
import { AppError } from "../../utils/AppError";

/** Mapea un registro de Prisma a la entidad de dominio LoyaltyAccount. */
function mapAccount(r: any): LoyaltyAccount {
  return new LoyaltyAccount({
    id:          r.id,
    userId:      r.userId,
    points:      r.points,
    level:       r.level as LoyaltyLevel,
    discountPct: r.discountPct,
    updatedAt:   r.updatedAt,
  });
}

/** Mapea un registro de Prisma a la entidad de dominio LoyaltyTransaction. */
function mapTransaction(r: any): LoyaltyTransaction {
  return new LoyaltyTransaction({
    id:          r.id,
    accountId:   r.accountId,
    type:        r.type as LoyaltyTxType,
    points:      r.points,
    reason:      r.reason,
    referenceId: r.referenceId ?? undefined,
    createdAt:   r.createdAt,
  });
}

export class PrismaLoyaltyRepository implements ILoyaltyRepository {
  /**
   * Busca la cuenta de puntos del cliente por userId.
   * Retorna null si el cliente aun no tiene cuenta de fidelizacion.
   */
  async findAccountByUserId(userId: string): Promise<LoyaltyAccount | null> {
    const r = await prisma.loyaltyAccount.findUnique({ where: { userId } });
    return r ? mapAccount(r) : null;
  }

  /**
   * Crea una cuenta de fidelizacion con valores por defecto:
   * points=0, level=BASIC, discountPct=0.
   * Lanza AppError 409 si el usuario ya tiene cuenta (restriccion @unique).
   */
  async createAccount(data: { userId: string }): Promise<LoyaltyAccount> {
    try {
      const r = await prisma.loyaltyAccount.create({
        data: { userId: data.userId },
      });
      return mapAccount(r);
    } catch (err: any) {
      // P2002 = unique constraint violation (userId ya tiene cuenta)
      if (err?.code === "P2002") {
        throw AppError.conflict("El usuario ya tiene una cuenta de fidelizacion.");
      }
      throw err;
    }
  }

  /**
   * Actualiza campos especificos de la cuenta: points, level y/o discountPct.
   * Prisma@updatedAt actualiza el campo updatedAt de forma automatica.
   * Lanza AppError 404 si la cuenta no existe.
   */
  async updateAccount(
    id: string,
    data: Partial<Pick<LoyaltyAccount, "points" | "level" | "discountPct">>
  ): Promise<LoyaltyAccount> {
    try {
      const r = await prisma.loyaltyAccount.update({
        where: { id },
        data: {
          ...(data.points      !== undefined && { points:      data.points }),
          ...(data.level       !== undefined && { level:       data.level }),
          ...(data.discountPct !== undefined && { discountPct: data.discountPct }),
        },
      });
      return mapAccount(r);
    } catch (err: any) {
      // P2025 = record not found
      if (err?.code === "P2025") {
        throw AppError.notFound("Cuenta de fidelizacion no encontrada.");
      }
      throw err;
    }
  }

  /**
   * Registra un movimiento de puntos en el historial.
   * Operacion append-only; nunca modifica transacciones existentes.
   * Lanza AppError 404 si la cuenta referenciada no existe.
   */
  async addTransaction(data: {
    accountId: string;
    type: LoyaltyTxType;
    points: number;
    reason: string;
    referenceId?: string;
  }): Promise<LoyaltyTransaction> {
    try {
      const r = await prisma.loyaltyTransaction.create({
        data: {
          accountId:   data.accountId,
          type:        data.type,
          points:      data.points,
          reason:      data.reason,
          referenceId: data.referenceId ?? null,
        },
      });
      return mapTransaction(r);
    } catch (err: any) {
      if (err?.code === "P2003") {
        throw AppError.notFound("Cuenta de fidelizacion no encontrada.");
      }
      throw err;
    }
  }

  /**
   * Obtiene el historial paginado de movimientos de una cuenta.
   * Ordena por fecha descendente (mas reciente primero).
   * page y limit tienen defaults de 1 y 20 respectivamente.
   */
  async getTransactionsByAccount(
    accountId: string,
    page = 1,
    limit = 20
  ): Promise<LoyaltyTransaction[]> {
    const records = await prisma.loyaltyTransaction.findMany({
      where:   { accountId },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    });
    return records.map(mapTransaction);
  }
}
