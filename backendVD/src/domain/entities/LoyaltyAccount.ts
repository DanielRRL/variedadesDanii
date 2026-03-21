/**
 * Entidad de dominio: Cuenta de Fidelizacion (LoyaltyAccount).
 * Almacena los puntos acumulados, el nivel de fidelizacion y el
 * porcentaje de descuento activo de un cliente. Relacion 1:1 con User.
 * Los cambios de puntos se registran en LoyaltyTransaction.
 */

/** Niveles posibles dentro del programa de puntos. */
export enum LoyaltyLevel {
  BASIC     = "BASIC",     // Nivel inicial (0-99 puntos).
  PREFERRED = "PREFERRED", // Nivel intermedio (100-499 puntos).
  VIP       = "VIP",       // Nivel maximo (500+ puntos).
}

/** Tipos de movimiento de puntos. */
export enum LoyaltyTxType {
  EARN   = "EARN",   // Acumulacion por compra u accion.
  REDEEM = "REDEEM", // Canje como descuento en una orden.
  EXPIRE = "EXPIRE", // Expiracion automatica por politica.
  ADJUST = "ADJUST", // Ajuste manual por administrador.
}

/** Propiedades para construir una cuenta de fidelizacion. */
export interface LoyaltyAccountProps {
  id?: string;
  userId: string;          // FK al usuario dueno de la cuenta.
  points?: number;         // Puntos disponibles para canje.
  level?: LoyaltyLevel;    // Nivel calculado segun historial.
  discountPct?: number;    // Porcentaje de descuento activo (0-30).
  updatedAt?: Date;
}

/** Entidad de dominio LoyaltyAccount. */
export class LoyaltyAccount {
  public readonly id?: string;
  public userId: string;
  public points: number;
  public level: LoyaltyLevel;
  public discountPct: number;
  public readonly updatedAt?: Date;

  constructor(props: LoyaltyAccountProps) {
    this.id         = props.id;
    this.userId     = props.userId;
    this.points     = props.points    ?? 0;
    this.level      = props.level     ?? LoyaltyLevel.BASIC;
    this.discountPct = props.discountPct ?? 0;
    this.updatedAt  = props.updatedAt;
  }
}
