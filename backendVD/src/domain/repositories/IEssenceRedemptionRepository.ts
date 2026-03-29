/**
 * Contrato del repositorio de Canjes de Esencia (EssenceRedemption).
 * Define las operaciones de persistencia para registros de canje de gramos
 * por esencia. La logica de validacion y gramaje vive en GramService.
 */

import { EssenceRedemption } from "../entities/EssenceRedemption";

/**
 * Interfaz que deben implementar todos los repositorios de canjes de esencia.
 * Toda implementacion concreta reside en infrastructure/repositories/.
 */
export interface IEssenceRedemptionRepository {
  /**
   * Crea un nuevo registro de canje de gramos por esencia.
   * El estado inicial es PENDING_DELIVERY.
   * @param data.userId      - UUID del usuario que canjea.
   * @param data.gramsUsed   - Gramos descontados de la billetera.
   * @param data.ozRedeemed  - Onzas equivalentes (gramsUsed / 13.0).
   * @param data.essenceName - Nombre de la esencia elegida.
   * @param data.essenceId   - ID opcional de la esencia del catalogo.
   */
  create(data: {
    userId: string;
    gramsUsed: number;
    ozRedeemed: number;
    essenceName: string;
    essenceId?: string;
  }): Promise<EssenceRedemption>;

  /**
   * Lista los canjes con estado PENDING_DELIVERY, paginados.
   * Usado por el panel admin para gestionar entregas pendientes.
   * @param page  - Pagina solicitada (base 1).
   * @param limit - Registros por pagina.
   */
  findPendingDeliveries(
    page: number,
    limit: number
  ): Promise<{ redemptions: EssenceRedemption[]; total: number }>;

  /**
   * Marca un canje como DELIVERED por un admin.
   * @param redemptionId - UUID del canje a marcar.
   * @param adminId      - UUID del admin que proceso la entrega.
   * @param notes        - Notas opcionales sobre la entrega.
   */
  markDelivered(
    redemptionId: string,
    adminId: string,
    notes?: string
  ): Promise<EssenceRedemption>;

  /**
   * Obtiene todos los canjes de un usuario, ordenados por fecha descendente.
   * @param userId - UUID del usuario.
   */
  findByUser(userId: string): Promise<EssenceRedemption[]>;

  /**
   * Cancela un canje y revierte los gramos a la billetera del usuario.
   * La reversion de gramos la realiza el servicio que llama a este metodo.
   * @param redemptionId - UUID del canje a cancelar.
   * @param adminId      - UUID del admin que cancela.
   */
  cancelRedemption(
    redemptionId: string,
    adminId: string
  ): Promise<EssenceRedemption>;
}
