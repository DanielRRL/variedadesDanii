/**
 * Controlador de Fichas de Juego (GameTokenController).
 * Maneja endpoints para consultar fichas pendientes y jugar minijuegos.
 * El userId del cliente autenticado se extrae del JWT via req.userId.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// GameTokenService - Servicio de emision y resolucion de fichas.
import { GameTokenService } from "../../application/services/GameTokenService";

// IGameTokenRepository - Para consultar fichas usadas del usuario.
import { IGameTokenRepository } from "../../domain/repositories/IGameTokenRepository";

// GameType - Enum de tipos de juego.
import { GameType } from "../../domain/entities/GameToken";

// AppError - Errores HTTP personalizados.
import { AppError } from "../../utils/AppError";

// param - Helper de Express 5 para extraer params.
import { param } from "../../utils/param";

export class GameTokenController {
  /**
   * @param gameTokenService - Servicio de fichas de juego.
   * @param gameTokenRepo    - Repo de fichas para conteos adicionales.
   */
  constructor(
    private readonly gameTokenService: GameTokenService,
    private readonly gameTokenRepo: IGameTokenRepository,
  ) {}

  /**
   * GET /api/game-tokens/my — CLIENT only
   * Retorna fichas pendientes del usuario y cantidad de fichas ya usadas.
   */
  getMyTokens = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId as string;
      const pendingTokens = await this.gameTokenService.getPendingTokens(userId);

      // Contar fichas usadas: todas las fichas del usuario menos las pendientes
      // No hay un metodo directo; se puede inferir del conteo total
      // Por ahora exponer solo lo que el frontend necesita
      res.json({
        success: true,
        data: {
          pendingTokens,
          pendingCount: pendingTokens.length,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/game-tokens/:tokenId/play — CLIENT only
   * Juega una ficha de minijuego (ROULETTE o PUZZLE).
   * Body: { gameType: 'ROULETTE' | 'PUZZLE' }
   * Valida que el gameType sea un valor valido del enum.
   * Retorna gramos ganados, nuevo balance y si completo 1 oz.
   */
  playGame = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).userId as string;
      const tokenId = param(req, "tokenId");
      const { gameType } = req.body;

      // Validar que gameType sea un valor valido
      if (!gameType || !Object.values(GameType).includes(gameType as GameType)) {
        throw AppError.badRequest(
          `gameType must be one of: ${Object.values(GameType).join(", ")}`
        );
      }

      const result = await this.gameTokenService.playGame(
        userId,
        tokenId,
        gameType as GameType,
      );

      // Construir mensaje descriptivo para el frontend
      const message = result.ozCompleted
        ? `¡Ganaste ${result.gramsWon}g y completaste 1 oz de esencia!`
        : `¡Ganaste ${result.gramsWon}g! Tu balance actual es ${result.newBalance}g.`;

      res.json({
        success: true,
        data: {
          gramsWon: result.gramsWon,
          newGramBalance: result.newBalance,
          ozCompleted: result.ozCompleted,
          message,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
