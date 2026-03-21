/**
 * Entidad de dominio: Movimiento de Puntos (LoyaltyTransaction).
 * Registro inmutable de cada cambio de puntos en una cuenta de
 * fidelizacion. Puntos positivos = acumulacion; negativos = canje/expiracion.
 */

import { LoyaltyTxType } from "./LoyaltyAccount";
export { LoyaltyTxType };

/** Propiedades para construir un movimiento de puntos. */
export interface LoyaltyTransactionProps {
  id?: string;
  accountId: string;        // FK a la cuenta de fidelizacion.
  type: LoyaltyTxType;      // Clasificacion del movimiento.
  points: number;           // Positivo = ganancia, negativo = canje/expiracion.
  reason: string;           // Descripcion legible del motivo.
  referenceId?: string;     // ID de la orden o devolucion origen (opcional).
  createdAt?: Date;
}

/** Entidad de dominio LoyaltyTransaction. */
export class LoyaltyTransaction {
  public readonly id?: string;
  public accountId: string;
  public type: LoyaltyTxType;
  public points: number;
  public reason: string;
  public referenceId?: string;
  public readonly createdAt?: Date;

  constructor(props: LoyaltyTransactionProps) {
    this.id          = props.id;
    this.accountId   = props.accountId;
    this.type        = props.type;
    this.points      = props.points;
    this.reason      = props.reason;
    this.referenceId = props.referenceId;
    this.createdAt   = props.createdAt;
  }
}
