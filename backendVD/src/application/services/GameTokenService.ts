/**
 * Servicio de Fichas de Juego (GameTokenService).
 * Administra la emision y resolucion de fichas de juego (ROULETTE / PUZZLE).
 * Cada compra entregada genera una ficha; el usuario tiene hasta 72h para jugar.
 * Maximo 3 fichas pendientes. El resultado otorga gramos via GramService.
 *
 * Sigue el principio de inversion de dependencias (DIP).
 */

// IGameTokenRepository - Contrato de persistencia para fichas de juego.
import { IGameTokenRepository } from "../../domain/repositories/IGameTokenRepository";

// GramService - Para acreditar gramos al jugar.
import { GramService } from "./GramService";

// Entidades de dominio.
import { GameToken, GameTokenStatus, GameType } from "../../domain/entities/GameToken";
import { GramSourceType } from "../../domain/entities/GramAccount";

// AppError para errores HTTP personalizados.
import { AppError } from "../../utils/AppError";

// Logger Winston.
import logger from "../../utils/logger";

// ---------------------------------------------------------------------------
// Constantes de reglas de negocio del sistema de fichas
// ---------------------------------------------------------------------------

/** Maximo de fichas pendientes por usuario. */
export const MAX_PENDING_TOKENS = 3;

/** Horas de vigencia de una ficha de juego. */
export const TOKEN_EXPIRY_HOURS = 72;

/** Gramos posibles en la ruleta. */
export const ROULETTE_GRAM_RANGE = [1, 2, 3];

/** Probabilidades acumulativas de la ruleta: 50% → 1g, 35% → 2g, 15% → 3g. */
export const ROULETTE_PROBABILITIES = [0.5, 0.35, 0.15];

/** Gramos posibles en el puzzle. */
export const PUZZLE_GRAM_RANGE = [1, 2, 3, 4];

/** Probabilidades acumulativas del puzzle: 40% → 1g, 30% → 2g, 20% → 3g, 10% → 4g. */
export const PUZZLE_PROBABILITIES = [0.4, 0.3, 0.2, 0.1];

export class GameTokenService {
  /**
   * @param gameTokenRepo - Repositorio de fichas de juego.
   * @param gramService   - Servicio de gramos para acreditar premios.
   */
  constructor(
    private readonly gameTokenRepo: IGameTokenRepository,
    private readonly gramService: GramService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // issueToken
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Emite una ficha de juego al usuario tras una compra entregada.
   * Si ya tiene >= MAX_PENDING_TOKENS (3) fichas pendientes, retorna null
   * en vez de lanzar excepcion (fire-and-forget friendly).
   *
   * La ficha se crea con status PENDING, sin gameType, expirando en 72h.
   *
   * @param userId  - UUID del usuario.
   * @param orderId - UUID del pedido origen.
   * @returns GameToken emitida o null si excede el limite.
   */
  async issueToken(userId: string, orderId: string): Promise<GameToken | null> {
    // Paso 1: Verificar cuantas fichas pendientes tiene el usuario
    const pendingCount = await this.gameTokenRepo.countPendingByUser(userId);
    if (pendingCount >= MAX_PENDING_TOKENS) {
      logger.warn("issueToken: usuario ya tiene el maximo de fichas pendientes", {
        userId,
        pendingCount,
        orderId,
      });
      return null;
    }

    // Paso 2: Calcular fecha de expiracion
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    // Paso 3: Crear la ficha
    const token = await this.gameTokenRepo.create({
      userId,
      orderId,
      expiresAt,
    });

    logger.info("Ficha de juego emitida", {
      userId,
      orderId,
      tokenId: token.id,
      expiresAt,
    });

    return token;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // playGame
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resuelve una ficha de juego. El usuario elige tipo (ROULETTE o PUZZLE)
   * y se calcula el resultado con probabilidades ponderadas.
   *
   * Validaciones:
   * 1. La ficha debe existir.
   * 2. La ficha debe pertenecer al usuario.
   * 3. La ficha debe estar en status PENDING.
   * 4. La ficha no debe estar expirada.
   *
   * Pasos:
   * 1. Calcular gramos ganados con probabilidad ponderada.
   * 2. Marcar la ficha como USED con gameType, gramsWon, playedAt.
   * 3. Acreditar gramos via GramService.earnGrams().
   *
   * @param userId   - UUID del usuario que juega.
   * @param tokenId  - UUID de la ficha a jugar.
   * @param gameType - Tipo de juego elegido (ROULETTE o PUZZLE).
   * @returns Resultado del juego: gramos ganados y nuevo balance.
   */
  async playGame(
    userId: string,
    tokenId: string,
    gameType: GameType
  ): Promise<{ gramsWon: number; newBalance: number; ozCompleted: boolean }> {
    // Paso 1: Buscar y validar la ficha
    const token = await this.gameTokenRepo.findById(tokenId);
    if (!token) {
      throw AppError.notFound("Ficha de juego no encontrada.");
    }
    if (token.userId !== userId) {
      throw AppError.forbidden("Esta ficha no te pertenece.");
    }
    if (token.status !== GameTokenStatus.PENDING) {
      throw AppError.badRequest("Esta ficha ya fue usada o expiro.");
    }
    if (token.isExpired()) {
      // Marcar como expirada antes de lanzar error
      await this.gameTokenRepo.markAsUsed(tokenId, gameType, 0);
      throw AppError.badRequest("Esta ficha ha expirado.");
    }

    // Paso 2: Calcular gramos ganados segun tipo de juego
    const gramsWon = this.resolveWeightedRandom(gameType);

    // Paso 3: Marcar la ficha como usada
    await this.gameTokenRepo.markAsUsed(tokenId, gameType, gramsWon);

    // Paso 4: Acreditar gramos via GramService
    const result = await this.gramService.earnGrams(userId, {
      sourceType: gameType === GameType.ROULETTE
        ? GramSourceType.GAME_ROULETTE
        : GramSourceType.GAME_PUZZLE,
      grams:       gramsWon,
      description: `Juego ${gameType}: ganaste ${gramsWon}g`,
      referenceId: tokenId,
    });

    logger.info("Juego completado", {
      userId,
      tokenId,
      gameType,
      gramsWon,
      newBalance: result.newBalance,
    });

    return {
      gramsWon,
      newBalance: result.newBalance,
      ozCompleted: result.ozCompleted,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // getPendingTokens
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Devuelve todas las fichas pendientes (no expiradas, no usadas) del usuario.
   * @param userId - UUID del usuario.
   */
  async getPendingTokens(userId: string): Promise<GameToken[]> {
    return this.gameTokenRepo.findPendingByUser(userId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // expireOldTokens (cron job)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Expira todas las fichas cuyo expiresAt ha pasado.
   * Pensado para ejecutarse como tarea programada (cron).
   * @returns Numero de fichas expiradas.
   */
  async expireOldTokens(): Promise<number> {
    const count = await this.gameTokenRepo.expireOldTokens();
    if (count > 0) {
      logger.info(`Fichas expiradas por cron: ${count}`);
    }
    return count;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // resolveWeightedRandom (privado)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calcula el resultado de un juego usando probabilidades ponderadas.
   * Genera un numero aleatorio [0, 1) y recorre los buckets acumulativos
   * hasta encontrar el rango que lo contiene.
   *
   * @param gameType - Tipo de juego (ROULETTE o PUZZLE).
   * @returns Gramos ganados.
   */
  private resolveWeightedRandom(gameType: GameType): number {
    const range =
      gameType === GameType.ROULETTE ? ROULETTE_GRAM_RANGE : PUZZLE_GRAM_RANGE;
    const probabilities =
      gameType === GameType.ROULETTE ? ROULETTE_PROBABILITIES : PUZZLE_PROBABILITIES;

    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < probabilities.length; i++) {
      cumulative += probabilities[i];
      if (random < cumulative) {
        return range[i];
      }
    }

    // Fallback: ultimo valor (por redondeo de punto flotante)
    return range[range.length - 1];
  }
}
