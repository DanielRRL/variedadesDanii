/**
 * Contrato del repositorio de Verificacion de Correo (EmailVerification).
 * Define las operaciones de persistencia de los tokens de un solo uso
 * necesarios para el flujo RF-004 (verificacion de email).
 * La logica de generacion de tokens, envio de correo y control de
 * intentos reside en la capa de Application/Services.
 */

import { EmailVerification } from "../entities/EmailVerification";

/**
 * Interfaz que deben implementar todos los repositorios de
 * verificacion de correo.
 * Toda implementacion concreta reside en infrastructure/repositories/.
 */
export interface IEmailVerificationRepository {
  /**
   * Persiste un nuevo token de verificacion de correo.
   * Cada solicitud genera un token distinto; los anteriores
   * no se eliminan automaticamente (usar deleteByUserId antes si se desea).
   * @param data.userId    - UUID del usuario a verificar.
   * @param data.token     - Token aleatorio unico.
   * @param data.expiresAt - Momento de expiracion calculado por el servicio.
   */
  create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<EmailVerification>;

  /**
   * Busca un token de verificacion por su valor exacto.
   * El repositorio NO valida si esta expirado o usado; esa
   * responsabilidad es del servicio.
   * Retorna null si el token no existe en la BD.
   * @param token - Cadena del token a buscar.
   */
  findByToken(token: string): Promise<EmailVerification | null>;

  /**
   * Marca el token como consumido estableciendo usedAt=NOW().
   * Se llama una sola vez al verificar exitosamente el correo.
   * @param id - UUID del registro EmailVerification.
   */
  markAsUsed(id: string): Promise<void>;

  /**
   * Elimina todos los tokens de verificacion de un usuario.
   * Util para limpiar tokens anteriores antes de emitir uno nuevo
   * o al eliminar una cuenta.
   * @param userId - UUID del usuario cuyos tokens se eliminan.
   */
  deleteByUserId(userId: string): Promise<void>;

  /**
   * Cuenta cuantos tokens ha generado un usuario en los ultimos N minutos.
   * Permite al servicio aplicar rate-limiting y evitar spam de correos.
   * @param userId        - UUID del usuario.
   * @param sinceMinutes  - Ventana de tiempo en minutos hacia atras.
   */
  countRecentByUserId(userId: string, sinceMinutes: number): Promise<number>;
}
