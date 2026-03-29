/**
 * Contrato del repositorio de Gramos (Gram).
 * Define las operaciones de persistencia para GramAccount y
 * GramTransaction sin imponer ninguna tecnologia de base de datos.
 * La logica de negocio (topes, conversion, canje) vive
 * exclusivamente en la capa de Application/Services.
 */

import { GramAccount, GramSourceType } from "../entities/GramAccount";
import { GramTransaction } from "../entities/GramTransaction";

/**
 * Interfaz que deben implementar todos los repositorios de gramos.
 * Toda implementacion concreta reside en infrastructure/repositories/.
 */
export interface IGramRepository {
  /**
   * Busca la billetera de gramos del cliente por su userId.
   * Retorna null si el cliente aun no tiene billetera.
   * @param userId - UUID del usuario.
   */
  findAccountByUserId(userId: string): Promise<GramAccount | null>;

  /**
   * Crea una nueva billetera de gramos con 0 gramos y 0 compras.
   * Se invoca la primera vez que el usuario interactua con el sistema de gramos.
   * @param userId - UUID del usuario dueno de la billetera.
   */
  createAccount(userId: string): Promise<GramAccount>;

  /**
   * Registra un movimiento de gramos en el historial de la billetera.
   * Este metodo es append-only; nunca modifica registros existentes.
   * @param data.accountId   - UUID de la billetera afectada.
   * @param data.sourceType  - Origen del movimiento (compra, juego, reto, etc.).
   * @param data.gramsDelta  - Positivo = ganancia, negativo = canje.
   * @param data.description - Descripcion legible del movimiento.
   * @param data.referenceId - ID opcional del pedido, ficha o reto origen.
   */
  addTransaction(data: {
    accountId: string;
    sourceType: GramSourceType;
    gramsDelta: number;
    description: string;
    referenceId?: string;
  }): Promise<GramTransaction>;

  /**
   * Actualiza los gramos de la billetera usando incremento atomico de Prisma.
   * IMPORTANTE: usa prisma.$executeRaw con un UPDATE atomico para prevenir
   * condiciones de carrera en incrementos/decrementos concurrentes.
   * Tambien actualiza totalEarned (si delta > 0) o totalRedeemed (si delta < 0).
   * @param accountId - UUID de la billetera.
   * @param delta     - Gramos a sumar (positivo) o restar (negativo).
   */
  updateAccountGrams(accountId: string, delta: number): Promise<GramAccount>;

  /**
   * Obtiene el historial paginado de movimientos de gramos de una billetera.
   * Ordena por fecha descendente (mas reciente primero).
   * @param accountId - UUID de la billetera.
   * @param page      - Pagina solicitada (base 1).
   * @param limit     - Registros por pagina.
   */
  getTransactionHistory(
    accountId: string,
    page: number,
    limit: number
  ): Promise<{ transactions: GramTransaction[]; total: number }>;

  /**
   * Obtiene la billetera del usuario con el conteo de canjes pendientes de entrega.
   * Combina datos de gram_accounts y essence_redemptions en una sola consulta.
   * @param userId - UUID del usuario.
   */
  getAccountWithStats(userId: string): Promise<(GramAccount & { pendingRedemptions: number }) | null>;

  /**
   * Incrementa en 1 el contador de compras entregadas de la billetera.
   * Se llama cada vez que una orden del usuario pasa a DELIVERED.
   * @param accountId - UUID de la billetera.
   */
  incrementTotalPurchases(accountId: string): Promise<void>;
}
