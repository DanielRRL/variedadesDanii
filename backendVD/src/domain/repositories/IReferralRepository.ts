/**
 * Contrato del repositorio de Codigos de Referido (Referral).
 * Define operaciones de persistencia para ReferralCode y ReferralUsage.
 * La logica de validacion de codigos, calculo de recompensas y
 * asignacion de puntos reside en la capa de Application/Services.
 */

import { ReferralCode } from "../entities/ReferralCode";
import { ReferralUsage } from "../entities/ReferralUsage";

/**
 * Interfaz que deben implementar todos los repositorios de referidos.
 * Toda implementacion concreta reside en infrastructure/repositories/.
 */
export interface IReferralRepository {
  /**
   * Busca el codigo de referido propio de un usuario.
   * Retorna null si el usuario aun no tiene codigo generado.
   * @param userId - UUID del usuario propietario del codigo.
   */
  findCodeByUserId(userId: string): Promise<ReferralCode | null>;

  /**
   * Busca un codigo de referido por su cadena alfanumerica.
   * Usado al momento del registro de un nuevo cliente para validar
   * que el codigo ingresado existe y es activo.
   * @param code - Cadena del codigo (ej: "MARIA15").
   */
  findCodeByCode(code: string): Promise<ReferralCode | null>;

  /**
   * Crea un nuevo codigo de referido para un usuario.
   * El codigo debe ser unico; la capa de servicio es responsable
   * de verificar su unicidad antes de llamar este metodo.
   * @param data.userId - UUID del usuario propietario.
   * @param data.code   - Cadena alfanumerica unica del codigo.
   */
  createCode(data: { userId: string; code: string }): Promise<ReferralCode>;

  /**
   * Incrementa en 1 el contador de usos exitosos del codigo.
   * Se llama cada vez que un nuevo usuario completa su registro
   * usando ese codigo y la recompensa es elegible.
   * @param id - UUID del ReferralCode a actualizar.
   */
  incrementUsageCount(id: string): Promise<void>;

  /**
   * Registra que un nuevo usuario utilizo un codigo de referido.
   * Se almacena con rewardGiven=false hasta que el servicio
   * acredite la recompensa y llame markRewardGiven.
   * @param data.referralCodeId - UUID del codigo usado.
   * @param data.newUserId      - UUID del nuevo usuario.
   */
  createUsage(data: {
    referralCodeId: string;
    newUserId: string;
  }): Promise<ReferralUsage>;

  /**
   * Marca un registro de uso como recompensado (rewardGiven=true).
   * Se llama una sola vez, despues de acreditar los puntos al referidor.
   * @param usageId - UUID del ReferralUsage a actualizar.
   */
  markRewardGiven(usageId: string): Promise<void>;
}
