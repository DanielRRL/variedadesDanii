/**
 * Entidad de dominio: Codigo de Referido (ReferralCode).
 * Cadena alfanumerica unica que el cliente comparte con nuevos
 * usuarios. Cuando un nuevo usuario se registra con este codigo
 * se genera un ReferralUsage y eventualmente una recompensa.
 */

/** Propiedades para construir un codigo de referido. */
export interface ReferralCodeProps {
  id?: string;
  userId: string;      // FK al cliente dueno del codigo.
  code: string;        // Cadena legible, ej: "MARIA15".
  usageCount?: number; // Veces que fue usado exitosamente.
  createdAt?: Date;
}

/** Entidad de dominio ReferralCode. */
export class ReferralCode {
  public readonly id?: string;
  public userId: string;
  public code: string;
  public usageCount: number;
  public readonly createdAt?: Date;

  constructor(props: ReferralCodeProps) {
    this.id         = props.id;
    this.userId     = props.userId;
    this.code       = props.code;
    this.usageCount = props.usageCount ?? 0;
    this.createdAt  = props.createdAt;
  }
}
