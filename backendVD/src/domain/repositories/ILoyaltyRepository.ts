/**
 * Contrato del repositorio de Fidelizacion (Loyalty).
 * Define las operaciones de persistencia para LoyaltyAccount y
 * LoyaltyTransaction sin imponer ninguna tecnologia de base de datos.
 * La logica de negocio (calculo de nivel, threshold de puntos) vive
 * exclusivamente en la capa de Application/Services.
 */

import { LoyaltyAccount } from "../entities/LoyaltyAccount";
import { LoyaltyTransaction, LoyaltyTxType } from "../entities/LoyaltyTransaction";

/**
 * Interfaz que deben implementar todos los repositorios de fidelizacion.
 * Toda implementacion concreta reside en infrastructure/repositories/.
 */
export interface ILoyaltyRepository {
  /**
   * Busca la cuenta de puntos del cliente por su userId.
   * Retorna null si el cliente aun no tiene cuenta de fidelizacion.
   * @param userId - UUID del usuario.
   */
  findAccountByUserId(userId: string): Promise<LoyaltyAccount | null>;

  /**
   * Crea una nueva cuenta de fidelizacion con puntos en 0 y nivel BASIC.
   * Se invoca al registrar un cliente por primera vez.
   * @param data.userId - UUID del usuario dueno de la cuenta.
   */
  createAccount(data: { userId: string }): Promise<LoyaltyAccount>;

  /**
   * Actualiza uno o mas campos de la cuenta de fidelizacion.
   * Solo permite modificar: puntos, nivel y porcentaje de descuento.
   * Los cambios de puntos SIEMPRE deben acompanarse de un addTransaction.
   * @param id   - UUID de la cuenta a actualizar.
   * @param data - Campos a modificar (parcial).
   */
  updateAccount(
    id: string,
    data: Partial<Pick<LoyaltyAccount, "points" | "level" | "discountPct">>
  ): Promise<LoyaltyAccount>;

  /**
   * Registra un movimiento de puntos en el historial de la cuenta.
   * Este metodo es append-only; nunca modifica registros existentes.
   * @param data.accountId   - UUID de la cuenta afectada.
   * @param data.type        - Tipo de movimiento (EARN, REDEEM, etc.).
   * @param data.points      - Positivo = ganancia, negativo = canje/expiracion.
   * @param data.reason      - Descripcion legible del motivo.
   * @param data.referenceId - ID opcional de la orden o devolucion origen.
   */
  addTransaction(data: {
    accountId: string;
    type: LoyaltyTxType;
    points: number;
    reason: string;
    referenceId?: string;
  }): Promise<LoyaltyTransaction>;

  /**
   * Obtiene el historial paginado de movimientos de una cuenta.
   * Ordena por fecha descendente (mas reciente primero).
   * @param accountId - UUID de la cuenta de fidelizacion.
   * @param page      - Pagina solicitada (base 1, default 1).
   * @param limit     - Registros por pagina (default 20).
   */
  getTransactionsByAccount(
    accountId: string,
    page?: number,
    limit?: number
  ): Promise<LoyaltyTransaction[]>;
}
