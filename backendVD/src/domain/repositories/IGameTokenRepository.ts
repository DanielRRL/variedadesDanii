/**
 * Contrato del repositorio de Fichas de Juego (GameToken).
 * Define las operaciones de persistencia para GameToken.
 * La logica de probabilidades y emision vive en GameTokenService.
 */

import { GameToken, GameTokenStatus, GameType } from "../entities/GameToken";

/**
 * Interfaz que deben implementar todos los repositorios de fichas de juego.
 * Toda implementacion concreta reside en infrastructure/repositories/.
 */
export interface IGameTokenRepository {
  /**
   * Cuenta las fichas PENDING (no usadas ni expiradas) del usuario.
   * Se usa para validar el tope de MAX_PENDING_TOKENS (3).
   * @param userId - UUID del usuario.
   */
  countPendingByUser(userId: string): Promise<number>;

  /**
   * Crea una nueva ficha de juego con estado PENDING.
   * @param data.userId    - UUID del usuario que recibe la ficha.
   * @param data.orderId   - UUID del pedido que origino la ficha.
   * @param data.expiresAt - Fecha limite para usar la ficha (72h desde creacion).
   */
  create(data: {
    userId: string;
    orderId: string;
    expiresAt: Date;
  }): Promise<GameToken>;

  /**
   * Obtiene todas las fichas PENDING (no expiradas) del usuario.
   * Ordena por fecha de creacion descendente (mas recientes primero).
   * @param userId - UUID del usuario.
   */
  findPendingByUser(userId: string): Promise<GameToken[]>;

  /**
   * Marca una ficha como USED, registrando el tipo de juego y gramos ganados.
   * @param tokenId  - UUID de la ficha a marcar.
   * @param gameType - Tipo de juego elegido (ROULETTE o PUZZLE).
   * @param gramsWon - Gramos ganados en la partida.
   */
  markAsUsed(tokenId: string, gameType: GameType, gramsWon: number): Promise<GameToken>;

  /**
   * Marca como EXPIRED todas las fichas PENDING cuya fecha limite ya paso.
   * Se ejecuta desde un cron job periodico.
   * @returns Cantidad de fichas expiradas.
   */
  expireOldTokens(): Promise<number>;

  /**
   * Busca una ficha por su ID. Retorna null si no existe.
   * @param tokenId - UUID de la ficha.
   */
  findById(tokenId: string): Promise<GameToken | null>;
}
