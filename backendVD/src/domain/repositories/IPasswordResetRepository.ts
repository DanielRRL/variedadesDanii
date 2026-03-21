/**
 * Contrato del repositorio de Restablecimiento de Contrasena (PasswordReset).
 * Define las operaciones de persistencia de los tokens de un solo uso
 * para el flujo de recuperacion de contrasena olvidada.
 * La logica de generacion de tokens, envio de correo y hashing
 * de la nueva contrasena reside en la capa de Application/Services.
 */

import { PasswordReset } from "../entities/PasswordReset";

/**
 * Interfaz que deben implementar todos los repositorios de
 * restablecimiento de contrasena.
 * Toda implementacion concreta reside en infrastructure/repositories/.
 */
export interface IPasswordResetRepository {
  /**
   * Persiste un nuevo token de restablecimiento de contrasena.
   * Llamar deleteByUserId antes de crear uno nuevo para invalidar
   * tokens anteriores no consumidos del mismo usuario.
   * @param data.userId    - UUID del usuario que solicito el reset.
   * @param data.token     - Token aleatorio unico.
   * @param data.expiresAt - Momento de expiracion calculado por el servicio.
   */
  create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<PasswordReset>;

  /**
   * Busca un token de reset por su valor exacto.
   * El repositorio NO valida si esta expirado o usado; esa
   * responsabilidad es del servicio.
   * Retorna null si el token no existe en la BD.
   * @param token - Cadena del token a buscar.
   */
  findByToken(token: string): Promise<PasswordReset | null>;

  /**
   * Marca el token como consumido estableciendo usedAt=NOW().
   * Se llama una sola vez luego de confirmar el cambio de contrasena.
   * @param id - UUID del registro PasswordReset.
   */
  markAsUsed(id: string): Promise<void>;

  /**
   * Elimina todos los tokens de reset de un usuario.
   * Util para invalidar tokens anteriores antes de emitir uno nuevo
   * o al eliminar una cuenta.
   * @param userId - UUID del usuario cuyos tokens se eliminan.
   */
  deleteByUserId(userId: string): Promise<void>;
}
