/**
 * Implementacion Prisma del repositorio de Fichas de Juego.
 * Traduce las operaciones del contrato IGameTokenRepository a consultas
 * Prisma contra la tabla "game_tokens".
 */

// prisma - Instancia singleton de PrismaClient con el adapter pg.
import prisma from "../../config/database";

// IGameTokenRepository - Contrato que esta clase implementa.
import { IGameTokenRepository } from "../../domain/repositories/IGameTokenRepository";

// Entidades de dominio usadas como tipos de entrada/salida.
import { GameToken, GameTokenStatus, GameType } from "../../domain/entities/GameToken";

// AppError - Envuelve errores de Prisma en respuestas HTTP controladas.
import { AppError } from "../../utils/AppError";

/** Mapea un registro de Prisma a la entidad de dominio GameToken. */
function mapToken(r: any): GameToken {
  return new GameToken({
    id:        r.id,
    userId:    r.userId,
    orderId:   r.orderId,
    status:    r.status as GameTokenStatus,
    gameType:  r.gameType as GameType | null,
    gramsWon:  r.gramsWon,
    expiresAt: r.expiresAt,
    playedAt:  r.playedAt,
    createdAt: r.createdAt,
  });
}

export class PrismaGameTokenRepository implements IGameTokenRepository {
  /**
   * Cuenta las fichas PENDING (no expiradas en base al status) del usuario.
   * Se usa para validar el tope de MAX_PENDING_TOKENS (3).
   */
  async countPendingByUser(userId: string): Promise<number> {
    return prisma.gameToken.count({
      where: {
        userId,
        status: "PENDING",
      },
    });
  }

  /**
   * Crea una nueva ficha de juego con estado PENDING.
   */
  async create(data: {
    userId: string;
    orderId: string;
    expiresAt: Date;
  }): Promise<GameToken> {
    const r = await prisma.gameToken.create({
      data: {
        userId:    data.userId,
        orderId:   data.orderId,
        expiresAt: data.expiresAt,
      },
    });
    return mapToken(r);
  }

  /**
   * Obtiene todas las fichas PENDING (que aun no han expirado por fecha)
   * del usuario. Ordena por creacion descendente.
   */
  async findPendingByUser(userId: string): Promise<GameToken[]> {
    const records = await prisma.gameToken.findMany({
      where: {
        userId,
        status:    "PENDING",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    return records.map(mapToken);
  }

  /**
   * Marca una ficha como USED con el tipo de juego y gramos ganados.
   * Lanza AppError 404 si la ficha no existe.
   */
  async markAsUsed(
    tokenId: string,
    gameType: GameType,
    gramsWon: number
  ): Promise<GameToken> {
    try {
      const r = await prisma.gameToken.update({
        where: { id: tokenId },
        data: {
          status:   "USED",
          gameType,
          gramsWon,
          playedAt: new Date(),
        },
      });
      return mapToken(r);
    } catch (err: any) {
      if (err?.code === "P2025") {
        throw AppError.notFound("Ficha de juego no encontrada.");
      }
      throw err;
    }
  }

  /**
   * Marca como EXPIRED todas las fichas PENDING cuya fecha limite ya paso.
   * Retorna el numero de fichas expiradas para logging.
   */
  async expireOldTokens(): Promise<number> {
    const result = await prisma.gameToken.updateMany({
      where: {
        status:    "PENDING",
        expiresAt: { lte: new Date() },
      },
      data: { status: "EXPIRED" },
    });
    return result.count;
  }

  /**
   * Busca una ficha por su ID. Retorna null si no existe.
   */
  async findById(tokenId: string): Promise<GameToken | null> {
    const r = await prisma.gameToken.findUnique({ where: { id: tokenId } });
    return r ? mapToken(r) : null;
  }
}
