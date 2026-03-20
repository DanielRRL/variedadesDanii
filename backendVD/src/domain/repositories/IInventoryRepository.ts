/**
 * Interface del repositorio de Inventario.
 * Define operaciones para consultar stock y registrar movimientos.
 * El stock no se almacena como campo directo, se calcula
 * sumando entradas (IN) y restando salidas (OUT) de los movimientos.
 *
 * Maneja tres tipos de inventario:
 * - Esencias (ml): materia prima principal del negocio.
 * - Frascos (unidades): envases para los perfumes.
 * - Productos generales (unidades): accesorios y otros productos.
 */

/** Contrato del repositorio de inventario. */
export interface IInventoryRepository {
  // --- Esencias (ml) ---

  /** Calcula el stock actual de una esencia en ml: SUM(IN) - SUM(OUT). */
  getEssenceStock(essenceId: string): Promise<number>;

  /** Registra un movimiento de esencia (entrada o salida en ml). */
  createEssenceMovement(data: {
    essenceId: string;
    type: string;      // "IN" o "OUT".
    ml: number;        // Mililitros del movimiento.
    reason: string;    // Razon: PURCHASE, SALE, REFILL, ADJUSTMENT, RETURN.
    reference?: string;
  }): Promise<any>;

  /** Obtiene el historial de movimientos de una esencia. */
  getEssenceMovements(essenceId: string): Promise<any[]>;

  // --- Frascos (unidades) ---

  /** Calcula el stock actual de un frasco en unidades: SUM(IN) - SUM(OUT). */
  getBottleStock(bottleId: string): Promise<number>;

  /** Registra un movimiento de frasco (entrada o salida en unidades). */
  createBottleMovement(data: {
    bottleId: string;
    type: string;      // "IN" o "OUT".
    quantity: number;  // Unidades del movimiento.
    reason: string;    // Razon: PURCHASE, SALE, RETURN, ADJUSTMENT.
    reference?: string;
  }): Promise<any>;

  /** Obtiene el historial de movimientos de un frasco. */
  getBottleMovements(bottleId: string): Promise<any[]>;

  // --- Productos generales (unidades) ---

  /** Calcula el stock de un producto general: SUM(IN) - SUM(OUT). */
  getProductStock(productId: string): Promise<number>;

  /** Registra un movimiento de producto general (entrada o salida en unidades). */
  createProductMovement(data: {
    productId: string;
    type: string;      // "IN" o "OUT".
    quantity: number;  // Unidades del movimiento.
    reason: string;    // Razon: PURCHASE, SALE, ADJUSTMENT, RETURN.
    reference?: string;
  }): Promise<any>;

  /** Obtiene el historial de movimientos de un producto. */
  getProductMovements(productId: string): Promise<any[]>;

  // --- Auditorias de inventario ---

  /** Registra una auditoria de inventario (conciliacion fisico vs sistema). */
  createInventoryAudit(data: {
    entityType: string;   // "ESSENCE", "BOTTLE" o "PRODUCT".
    entityId: string;
    systemValue: number;
    physicalValue: number;
    difference: number;
    notes?: string;
    userId: string;
  }): Promise<any>;

  /** Obtiene auditorias filtradas por tipo de entidad. */
  getAuditsByEntityType(entityType: string): Promise<any[]>;

  /** Obtiene todas las auditorias de una entidad especifica. */
  getAuditsByEntityId(entityId: string): Promise<any[]>;
}
