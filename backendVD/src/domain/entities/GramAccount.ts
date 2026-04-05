/**
 * Entidad de dominio: Billetera de Gramos (GramAccount).
 * Almacena los gramos acumulados del cliente en el sistema de gamificacion.
 * Relacion 1:1 con User. Maximo 13g simultaneos (1 oz de esencia).
 * El canje se desbloquea al acumular 5 compras confirmadas.
 */

/** Tipos de origen de un movimiento de gramos. */
export enum GramSourceType {
  PRODUCT_PURCHASE     = "PRODUCT_PURCHASE",     // +1g por cada producto vendible comprado.
  ESSENCE_OZ_BONUS     = "ESSENCE_OZ_BONUS",     // +1g al canjear 1 oz o mas de esencia.
  GAME_ROULETTE        = "GAME_ROULETTE",        // Gramos ganados jugando ruleta (1-3g).
  GAME_PUZZLE          = "GAME_PUZZLE",           // Gramos ganados resolviendo puzzle (1-4g).
  GAME_MEMORY          = "GAME_MEMORY",           // Gramos ganados jugando memoria (1-4g).
  GAME_SCRATCH         = "GAME_SCRATCH",          // Gramos ganados con raspadita (1-3g).
  GAME_DICE            = "GAME_DICE",             // Gramos ganados con dados (1-3g).
  WEEKLY_CHALLENGE     = "WEEKLY_CHALLENGE",      // Gramos ganados al completar reto semanal.
  MONTHLY_RANKING      = "MONTHLY_RANKING",       // Gramos otorgados al top 10 mensual.
  ADMIN_ADJUSTMENT     = "ADMIN_ADJUSTMENT",      // Ajuste manual por administrador.
  REDEMPTION           = "REDEMPTION",            // Salida de gramos al canjear esencia (negativo).
}

/** Propiedades para construir una billetera de gramos. */
export interface GramAccountProps {
  id?: string;
  userId: string;           // FK al usuario dueno de la billetera.
  currentGrams?: number;    // Gramos actuales disponibles (0-13).
  totalEarned?: number;     // Total historico de gramos ganados.
  totalRedeemed?: number;   // Total historico de gramos canjeados.
  totalPurchases?: number;  // Total de compras entregadas del usuario.
  updatedAt?: Date;
}

/** Entidad de dominio GramAccount. */
export class GramAccount {
  public readonly id?: string;
  public userId: string;
  public currentGrams: number;
  public totalEarned: number;
  public totalRedeemed: number;
  public totalPurchases: number;
  public readonly updatedAt?: Date;

  constructor(props: GramAccountProps) {
    this.id             = props.id;
    this.userId         = props.userId;
    this.currentGrams   = props.currentGrams   ?? 0;
    this.totalEarned    = props.totalEarned    ?? 0;
    this.totalRedeemed  = props.totalRedeemed  ?? 0;
    this.totalPurchases = props.totalPurchases ?? 0;
    this.updatedAt      = props.updatedAt;
  }
}
