/**
 * Entidad de dominio: Transaccion de Gramos (GramTransaction).
 * Log inmutable de cada movimiento de gramos. Nunca se elimina ni edita.
 * Positivo = ganancia, negativo = canje/descuento.
 */

import { GramSourceType } from "./GramAccount";

/** Propiedades para construir una transaccion de gramos. */
export interface GramTransactionProps {
  id?: string;
  accountId: string;         // FK a la billetera de gramos.
  sourceType: GramSourceType; // Origen del movimiento.
  gramsDelta: number;        // Cantidad de gramos (+/-).
  description: string;       // Descripcion legible del movimiento.
  referenceId?: string;      // ID del pedido, ficha de juego, etc.
  createdAt?: Date;
}

/** Entidad de dominio GramTransaction. */
export class GramTransaction {
  public readonly id?: string;
  public accountId: string;
  public sourceType: GramSourceType;
  public gramsDelta: number;
  public description: string;
  public referenceId?: string;
  public readonly createdAt?: Date;

  constructor(props: GramTransactionProps) {
    this.id          = props.id;
    this.accountId   = props.accountId;
    this.sourceType  = props.sourceType as GramSourceType;
    this.gramsDelta  = props.gramsDelta;
    this.description = props.description;
    this.referenceId = props.referenceId;
    this.createdAt   = props.createdAt;
  }
}
