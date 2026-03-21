/**
 * Entidad de dominio: Restablecimiento de Contrasena (PasswordReset).
 * Token de un solo uso enviado al correo del usuario para autorizar
 * el cambio de su contrasena olvidada. Una vez consumido, usedAt != null.
 */

/** Propiedades para construir un token de restablecimiento de contrasena. */
export interface PasswordResetProps {
  id?: string;
  userId: string;       // FK al usuario que solicito el restablecimiento.
  token: string;        // Token aleatorio unico enviado al correo.
  expiresAt: Date;      // Fecha limite de validez del token.
  usedAt?: Date | null; // Fecha de consumo; null = aun valido/sin usar.
  createdAt?: Date;
}

/** Entidad de dominio PasswordReset. */
export class PasswordReset {
  public readonly id?: string;
  public userId: string;
  public token: string;
  public expiresAt: Date;
  public usedAt?: Date | null;
  public readonly createdAt?: Date;

  constructor(props: PasswordResetProps) {
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
