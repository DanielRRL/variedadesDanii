/**
 * Entidad de dominio: Ficha de Juego (GameToken).
 * Emitida por cada compra confirmada. Maximo 3 fichas PENDING por usuario.
 * Vence en 72 horas si no se usa.
 */

/** Estado de una ficha de juego. */
export enum GameTokenStatus {
  PENDING = "PENDING", // Ficha emitida, no usada aun.
  USED    = "USED",    // Ficha ya jugada.
  EXPIRED = "EXPIRED", // Ficha vencida (72h sin usar).
}

/** Tipo de minijuego disponible. */
export enum GameType {
  ROULETTE = "ROULETTE", // Ruleta: premio aleatorio 1-3g.
  PUZZLE   = "PUZZLE",   // Puzzle de logica: premio 1-4g segun dificultad.
}

/** Propiedades para construir una ficha de juego. */
export interface GameTokenProps {
  id?: string;
  userId: string;           // FK al usuario que recibio la ficha.
  orderId: string;          // ID del pedido que origino esta ficha.
  status?: GameTokenStatus; // Estado de la ficha.
  gameType?: GameType | null; // Tipo de juego elegido al jugar.
  gramsWon?: number;        // Gramos ganados en la partida.
  expiresAt: Date;          // Fecha limite para usar la ficha.
  playedAt?: Date | null;   // Fecha en que el usuario jugo.
  createdAt?: Date;
}

/** Entidad de dominio GameToken. */
export class GameToken {
  public readonly id?: string;
  public userId: string;
  public orderId: string;
  public status: GameTokenStatus;
  public gameType?: GameType | null;
  public gramsWon: number;
  public expiresAt: Date;
  public playedAt?: Date | null;
  public readonly createdAt?: Date;

  constructor(props: GameTokenProps) {
    this.id        = props.id;
    this.userId    = props.userId;
    this.orderId   = props.orderId;
    this.status    = props.status    ?? GameTokenStatus.PENDING;
    this.gameType  = props.gameType  ?? null;
    this.gramsWon  = props.gramsWon  ?? 0;
    this.expiresAt = props.expiresAt;
    this.playedAt  = props.playedAt  ?? null;
    this.createdAt = props.createdAt;
  }

  /** Indica si la ficha esta expirada. */
  isExpired(): boolean {
    return this.expiresAt < new Date();
  }
}
