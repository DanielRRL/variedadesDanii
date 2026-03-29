/**
 * Implementacion Prisma del repositorio de Gramos.
 * Traduce las operaciones del contrato IGramRepository a consultas
 * Prisma contra las tablas "gram_accounts" y "gram_transactions".
 */

// prisma - Instancia singleton de PrismaClient con el adapter pg.
import prisma from "../../config/database";

// IGramRepository - Contrato que esta clase implementa.
import { IGramRepository } from "../../domain/repositories/IGramRepository";

// Entidades de dominio usadas como tipos de entrada/salida.
import { GramAccount, GramSourceType } from "../../domain/entities/GramAccount";
import { GramTransaction } from "../../domain/entities/GramTransaction";

// AppError - Envuelve errores de Prisma en respuestas HTTP controladas.
import { AppError } from "../../utils/AppError";

/** Mapea un registro de Prisma a la entidad de dominio GramAccount. */
function mapAccount(r: any): GramAccount {
  return new GramAccount({
    id:             r.id,
    userId:         r.userId,
    currentGrams:   r.currentGrams,
    totalEarned:    r.totalEarned,
    totalRedeemed:  r.totalRedeemed,
    totalPurchases: r.totalPurchases,
    updatedAt:      r.updatedAt,
  });
}

/** Mapea un registro de Prisma a la entidad de dominio GramTransaction. */
function mapTransaction(r: any): GramTransaction {
  return new GramTransaction({
    id:          r.id,
    accountId:   r.accountId,
    sourceType:  r.sourceType as GramSourceType,
    gramsDelta:  r.gramsDelta,
    description: r.description,
    referenceId: r.referenceId ?? undefined,
    createdAt:   r.createdAt,
  });
}

export class PrismaGramRepository implements IGramRepository {
  /**
   * Busca la billetera de gramos del cliente por userId.
   * Retorna null si el cliente aun no tiene billetera.
   */
  async findAccountByUserId(userId: string): Promise<GramAccount | null> {
    const r = await prisma.gramAccount.findUnique({ where: { userId } });
    return r ? mapAccount(r) : null;
  }

  /**
   * Crea una billetera de gramos con valores por defecto:
   * currentGrams=0, totalEarned=0, totalRedeemed=0, totalPurchases=0.
   * Lanza AppError 409 si el usuario ya tiene billetera (restriccion @unique).
   */
  async createAccount(userId: string): Promise<GramAccount> {
    try {
      const r = await prisma.gramAccount.create({
        data: { userId },
      });
      return mapAccount(r);
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw AppError.conflict("El usuario ya tiene una billetera de gramos.");
      }
      throw err;
    }
  }

  /**
   * Registra un movimiento de gramos en el historial.
   * Operacion append-only; nunca modifica transacciones existentes.
   */
  async addTransaction(data: {
    accountId: string;
    sourceType: GramSourceType;
    gramsDelta: number;
    description: string;
    referenceId?: string;
  }): Promise<GramTransaction> {
    try {
      const r = await prisma.gramTransaction.create({
        data: {
          accountId:   data.accountId,
          sourceType:  data.sourceType,
          gramsDelta:  data.gramsDelta,
          description: data.description,
          referenceId: data.referenceId ?? null,
        },
      });
      return mapTransaction(r);
    } catch (err: any) {
      if (err?.code === "P2003") {
        throw AppError.notFound("Billetera de gramos no encontrada.");
      }
      throw err;
    }
  }

  /**
   * Actualiza los gramos usando incremento atomico de Prisma para prevenir
   * condiciones de carrera. Si delta > 0 tambien incrementa totalEarned.
   * Si delta < 0 tambien incrementa totalRedeemed (como valor absoluto).
   */
  async updateAccountGrams(accountId: string, delta: number): Promise<GramAccount> {
    try {
      const r = await prisma.gramAccount.update({
        where: { id: accountId },
        data: {
          currentGrams:  { increment: delta },
          ...(delta > 0 && { totalEarned:   { increment: delta } }),
          ...(delta < 0 && { totalRedeemed: { increment: Math.abs(delta) } }),
        },
      });
      return mapAccount(r);
    } catch (err: any) {
      if (err?.code === "P2025") {
        throw AppError.notFound("Billetera de gramos no encontrada.");
      }
      throw err;
    }
  }

  /**
   * Obtiene el historial paginado de movimientos de gramos de una billetera.
   * Ordena por fecha descendente (mas reciente primero).
   */
  async getTransactionHistory(
    accountId: string,
    page: number,
    limit: number
  ): Promise<{ transactions: GramTransaction[]; total: number }> {
    const [records, total] = await Promise.all([
      prisma.gramTransaction.findMany({
        where:   { accountId },
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.gramTransaction.count({ where: { accountId } }),
    ]);
    return {
      transactions: records.map(mapTransaction),
      total,
    };
  }

  /**
   * Obtiene la billetera del usuario con el conteo de canjes pendientes de entrega.
   * Combina datos de gram_accounts y un count de essence_redemptions PENDING_DELIVERY.
   */
  async getAccountWithStats(
    userId: string
  ): Promise<(GramAccount & { pendingRedemptions: number }) | null> {
    const r = await prisma.gramAccount.findUnique({ where: { userId } });
    if (!r) return null;

    const pendingRedemptions = await prisma.essenceRedemption.count({
      where: { userId, status: "PENDING_DELIVERY" },
    });

    const account = mapAccount(r);
    return { ...account, pendingRedemptions };
  }

  /**
   * Incrementa en 1 el contador de compras entregadas de la billetera.
   * Usa incremento atomico de Prisma.
   */
  async incrementTotalPurchases(accountId: string): Promise<void> {
    await prisma.gramAccount.update({
      where: { id: accountId },
      data:  { totalPurchases: { increment: 1 } },
    });
  }
}
