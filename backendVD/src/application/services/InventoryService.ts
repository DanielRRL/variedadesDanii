/**
 * Servicio de inventario.
 * Controla stock de esencias (ml), frascos (unidades) y productos generales (unidades)
 * mediante movimientos de entrada/salida.
 * Valida disponibilidad antes de permitir salidas.
 * Incluye auditorias de inventario para conciliacion fisico vs sistema.
 */

// IInventoryRepository - Contrato del repositorio de inventario.
import { IInventoryRepository } from "../../domain/repositories/IInventoryRepository";

// AppError - Errores HTTP para validaciones (badRequest).
import { AppError } from "../../utils/AppError";

// logger - Winston logger para registrar cada movimiento.
import logger from "../../utils/logger";

export class InventoryService {
  /** Recibe el repositorio de inventario via inyeccion de dependencias. */
  constructor(private readonly inventoryRepo: IInventoryRepository) {}

  // ---------------------------------------------------------------------------
  // Esencias (ml)
  // ---------------------------------------------------------------------------

  /** Consulta el stock actual en ml de una esencia. */
  async getEssenceStock(essenceId: string): Promise<number> {
    return this.inventoryRepo.getEssenceStock(essenceId);
  }

  /**
   * Registra una entrada de ml de esencia al inventario.
   * Valida que ml > 0 antes de crear el movimiento.
   */
  async registerEssenceEntry(
    essenceId: string,
    ml: number,
    reason: string,
    reference?: string
  ): Promise<any> {
    if (ml <= 0) {
      throw AppError.badRequest("Milliliters must be greater than 0");
    }

    const movement = await this.inventoryRepo.createEssenceMovement({
      essenceId,
      type: "IN",
      ml,
      reason,
      reference,
    });

    logger.info(`Essence IN movement: ${ml}ml for essence ${essenceId} - ${reason}`);
    return movement;
  }

  /**
   * Registra una salida de ml de esencia.
   * Valida ml > 0 y que haya stock suficiente para cubrir la salida.
   */
  async registerEssenceExit(
    essenceId: string,
    ml: number,
    reason: string,
    reference?: string
  ): Promise<any> {
    if (ml <= 0) {
      throw AppError.badRequest("Milliliters must be greater than 0");
    }

    const currentStock = await this.inventoryRepo.getEssenceStock(essenceId);
    if (currentStock < ml) {
      throw AppError.badRequest(
        `Insufficient essence stock. Available: ${currentStock}ml, Requested: ${ml}ml`
      );
    }

    const movement = await this.inventoryRepo.createEssenceMovement({
      essenceId,
      type: "OUT",
      ml,
      reason,
      reference,
    });

    logger.info(`Essence OUT movement: ${ml}ml for essence ${essenceId} - ${reason}`);
    return movement;
  }

  /** Obtiene historial de movimientos de una esencia. */
  async getEssenceMovements(essenceId: string): Promise<any[]> {
    return this.inventoryRepo.getEssenceMovements(essenceId);
  }

  /** Verifica si hay suficientes ml de esencia para una operacion. */
  async validateEssenceAvailability(
    essenceId: string,
    requiredMl: number
  ): Promise<boolean> {
    const stock = await this.inventoryRepo.getEssenceStock(essenceId);
    return stock >= requiredMl;
  }

  // ---------------------------------------------------------------------------
  // Frascos (unidades)
  // ---------------------------------------------------------------------------

  /** Consulta el stock actual en unidades de un frasco. */
  async getBottleStock(bottleId: string): Promise<number> {
    return this.inventoryRepo.getBottleStock(bottleId);
  }

  /**
   * Registra una entrada de unidades de frascos.
   * Valida que quantity > 0.
   */
  async registerBottleEntry(
    bottleId: string,
    quantity: number,
    reason: string,
    reference?: string
  ): Promise<any> {
    if (quantity <= 0) {
      throw AppError.badRequest("Quantity must be greater than 0");
    }

    const movement = await this.inventoryRepo.createBottleMovement({
      bottleId,
      type: "IN",
      quantity,
      reason,
      reference,
    });

    logger.info(
      `Bottle IN movement: ${quantity} units for bottle ${bottleId} - ${reason}`
    );
    return movement;
  }

  /**
   * Registra una salida de unidades de frascos.
   * Valida quantity > 0 y stock disponible.
   */
  async registerBottleExit(
    bottleId: string,
    quantity: number,
    reason: string,
    reference?: string
  ): Promise<any> {
    if (quantity <= 0) {
      throw AppError.badRequest("Quantity must be greater than 0");
    }

    const currentStock = await this.inventoryRepo.getBottleStock(bottleId);
    if (currentStock < quantity) {
      throw AppError.badRequest(
        `Insufficient bottle stock. Available: ${currentStock}, Requested: ${quantity}`
      );
    }

    const movement = await this.inventoryRepo.createBottleMovement({
      bottleId,
      type: "OUT",
      quantity,
      reason,
      reference,
    });

    logger.info(
      `Bottle OUT movement: ${quantity} units for bottle ${bottleId} - ${reason}`
    );
    return movement;
  }

  /** Obtiene historial de movimientos de un frasco. */
  async getBottleMovements(bottleId: string): Promise<any[]> {
    return this.inventoryRepo.getBottleMovements(bottleId);
  }

  /** Verifica si hay suficientes unidades de un frasco. */
  async validateBottleAvailability(
    bottleId: string,
    requiredQty: number
  ): Promise<boolean> {
    const stock = await this.inventoryRepo.getBottleStock(bottleId);
    return stock >= requiredQty;
  }

  // ---------------------------------------------------------------------------
  // Productos generales (unidades) - ACCESSORY y GENERAL
  // ---------------------------------------------------------------------------

  /** Consulta el stock actual en unidades de un producto general. */
  async getProductStock(productId: string): Promise<number> {
    return this.inventoryRepo.getProductStock(productId);
  }

  /**
   * Registra una entrada de unidades de producto general.
   * Valida que quantity > 0.
   */
  async registerProductEntry(
    productId: string,
    quantity: number,
    reason: string,
    reference?: string
  ): Promise<any> {
    if (quantity <= 0) {
      throw AppError.badRequest("Quantity must be greater than 0");
    }

    const movement = await this.inventoryRepo.createProductMovement({
      productId,
      type: "IN",
      quantity,
      reason,
      reference,
    });

    logger.info(
      `Product IN movement: ${quantity} units for product ${productId} - ${reason}`
    );
    return movement;
  }

  /**
   * Registra una salida de unidades de producto general.
   * Valida quantity > 0 y stock disponible.
   */
  async registerProductExit(
    productId: string,
    quantity: number,
    reason: string,
    reference?: string
  ): Promise<any> {
    if (quantity <= 0) {
      throw AppError.badRequest("Quantity must be greater than 0");
    }

    const currentStock = await this.inventoryRepo.getProductStock(productId);
    if (currentStock < quantity) {
      throw AppError.badRequest(
        `Insufficient product stock. Available: ${currentStock}, Requested: ${quantity}`
      );
    }

    const movement = await this.inventoryRepo.createProductMovement({
      productId,
      type: "OUT",
      quantity,
      reason,
      reference,
    });

    logger.info(
      `Product OUT movement: ${quantity} units for product ${productId} - ${reason}`
    );
    return movement;
  }

  /** Obtiene historial de movimientos de un producto general. */
  async getProductMovements(productId: string): Promise<any[]> {
    return this.inventoryRepo.getProductMovements(productId);
  }

  /** Verifica si hay suficientes unidades de un producto general. */
  async validateProductAvailability(
    productId: string,
    requiredQty: number
  ): Promise<boolean> {
    const stock = await this.inventoryRepo.getProductStock(productId);
    return stock >= requiredQty;
  }

  // ---------------------------------------------------------------------------
  // Auditorias de inventario
  // ---------------------------------------------------------------------------

  /**
   * Realiza una auditoria de inventario.
   * Compara el valor del sistema con el conteo fisico y registra la diferencia.
   * Si hay diferencia, crea un movimiento de ADJUSTMENT para corregir.
   */
  async performAudit(
    entityType: string,
    entityId: string,
    physicalValue: number,
    userId: string,
    notes?: string
  ): Promise<any> {
    if (physicalValue < 0) {
      throw AppError.badRequest("Physical value cannot be negative");
    }

    // Obtener el valor actual del sistema segun el tipo de entidad
    let systemValue: number;
    if (entityType === "ESSENCE") {
      systemValue = await this.getEssenceStock(entityId);
    } else if (entityType === "BOTTLE") {
      systemValue = await this.getBottleStock(entityId);
    } else if (entityType === "PRODUCT") {
      systemValue = await this.getProductStock(entityId);
    } else {
      throw AppError.badRequest("Invalid entity type. Use ESSENCE, BOTTLE or PRODUCT");
    }

    const difference = physicalValue - systemValue;

    // Registrar la auditoria
    const audit = await this.inventoryRepo.createInventoryAudit({
      entityType,
      entityId,
      systemValue,
      physicalValue,
      difference,
      notes,
      userId,
    });

    // Si hay diferencia, crear movimiento de ajuste para sincronizar
    if (difference !== 0) {
      const movementType = difference > 0 ? "IN" : "OUT";
      const absValue = Math.abs(difference);

      if (entityType === "ESSENCE") {
        await this.inventoryRepo.createEssenceMovement({
          essenceId: entityId,
          type: movementType,
          ml: absValue,
          reason: "ADJUSTMENT",
          reference: `audit:${audit.id}`,
        });
      } else if (entityType === "BOTTLE") {
        await this.inventoryRepo.createBottleMovement({
          bottleId: entityId,
          type: movementType,
          quantity: absValue,
          reason: "ADJUSTMENT",
          reference: `audit:${audit.id}`,
        });
      } else if (entityType === "PRODUCT") {
        await this.inventoryRepo.createProductMovement({
          productId: entityId,
          type: movementType,
          quantity: absValue,
          reason: "ADJUSTMENT",
          reference: `audit:${audit.id}`,
        });
      }

      logger.info(
        `Inventory audit adjustment: ${entityType} ${entityId} - System: ${systemValue}, Physical: ${physicalValue}, Diff: ${difference}`
      );
    }

    return audit;
  }

  /** Obtiene auditorias por tipo de entidad. */
  async getAuditsByEntityType(entityType: string): Promise<any[]> {
    return this.inventoryRepo.getAuditsByEntityType(entityType);
  }

  /** Obtiene auditorias de una entidad especifica. */
  async getAuditsByEntityId(entityId: string): Promise<any[]> {
    return this.inventoryRepo.getAuditsByEntityId(entityId);
  }
}
