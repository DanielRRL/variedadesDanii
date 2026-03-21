/**
 * Entidad de dominio: Verificacion de Correo (EmailVerification).
 * Token de un solo uso enviado al correo del usuario para confirmar
 * su direccion de email (RF-004). Una vez consumido, usedAt != null.
 */

/** Propiedades para construir un token de verificacion de correo. */
export interface EmailVerificationProps {
  id?: string;
  userId: string;       // FK al usuario que debe verificar su correo.
  token: string;        // Token aleatorio unico enviado al correo.
  expiresAt: Date;      // Fecha limite de validez del token.
  usedAt?: Date | null; // Fecha de consumo; null = aun valido/sin usar.
  createdAt?: Date;
}

/** Entidad de dominio EmailVerification. */
export class EmailVerification {
  public readonly id?: string;
  public userId: string;
  public token: string;
  public expiresAt: Date;
  public usedAt?: Date | null;
  public readonly createdAt?: Date;

  constructor(props: EmailVerificationProps) {
    this.id        = props.id;
    this.userId    = props.userId;
    this.token     = props.token;
    this.expiresAt = props.expiresAt;
    this.usedAt    = props.usedAt;
    this.createdAt = props.createdAt;
  }

  /** Retorna true si el token ya fue usado o ya expiro. */
  isExpiredOrUsed(): boolean {
    return !!this.usedAt || this.expiresAt < new Date();
  }
}
