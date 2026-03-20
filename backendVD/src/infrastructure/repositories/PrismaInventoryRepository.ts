/**
 * Implementacion del repositorio de inventario con Prisma.
 * El stock se calcula sumando movimientos IN menos movimientos OUT
 * (patron de event sourcing simplificado).
 * Maneja tres tipos de inventario:
 * - Esencias (ml): materia prima.
 * - Frascos (unidades): envases.
 * - Productos generales (unidades): accesorios y otros.
 * Incluye auditorias de inventario para conciliacion fisica.
 */

// prisma - Instancia singleton del cliente de base de datos.
import prisma from "../../config/database";

// IInventoryRepository - Contrato para operaciones de inventario.
import { IInventoryRepository } from "../../domain/repositories/IInventoryRepository";

export class PrismaInventoryRepository implements IInventoryRepository {

  // ---------------------------------------------------------------------------
  // Esencias (ml)
  // ---------------------------------------------------------------------------

  /**
   * Calcula el stock actual de una esencia en mililitros.
   * Formula: SUM(ml donde type=IN) - SUM(ml donde type=OUT).
   */
  async getEssenceStock(essenceId: string): Promise<number> {
    const inMovements = await prisma.essenceMovement.aggregate({
      where: { essenceId, type: "IN" },
      _sum: { ml: true },
    });

    const outMovements = await prisma.essenceMovement.aggregate({
      where: { essenceId, type: "OUT" },
      _sum: { ml: true },
    });

    const totalIn = inMovements._sum.ml || 0;
    const totalOut = outMovements._sum.ml || 0;

    return totalIn - totalOut;
  }

  /** Registra un movimiento de ml de esencia (entrada o salida). */
  async createEssenceMovement(data: {
    essenceId: string;
    type: string;
    ml: number;
    reason: string;
    reference?: string;
  }): Promise<any> {
    return prisma.essenceMovement.create({
      data: {
        essenceId: data.essenceId,
        type: data.type as any,
        ml: data.ml,
        reason: data.reason as any,
        reference: data.reference,
      },
    });
  }

  /** Historial de movimientos de una esencia, mas recientes primero. */
  async getEssenceMovements(essenceId: string): Promise<any[]> {
    return prisma.essenceMovement.findMany({
      where: { essenceId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------------------------------------------------------------------------
  // Frascos (unidades)
  // ---------------------------------------------------------------------------

  /**
   * Calcula el stock actual de un frasco en unidades.
   * Formula: SUM(qty donde type=IN) - SUM(qty donde type=OUT).
   */
  async getBottleStock(bottleId: string): Promise<number> {
    const inMovements = await prisma.bottleMovement.aggregate({
      where: { bottleId, type: "IN" },
      _sum: { quantity: true },
    });

    const outMovements = await prisma.bottleMovement.aggregate({
      where: { bottleId, type: "OUT" },
      _sum: { quantity: true },
    });

    const totalIn = inMovements._sum.quantity || 0;
    const totalOut = outMovements._sum.quantity || 0;

    return totalIn - totalOut;
  }

  /** Registra un movimiento de unidades de frascos (entrada o salida). */
  async createBottleMovement(data: {
    bottleId: string;
    type: string;
    quantity: number;
    reason: string;
    reference?: string;
  }): Promise<any> {
    return prisma.bottleMovement.create({
      data: {
        bottleId: data.bottleId,
        type: data.type as any,
        quantity: data.quantity,
        reason: data.reason as any,
        reference: data.reference,
      },
    });
  }

  /** Historial de movimientos de un frasco, mas recientes primero. */
  async getBottleMovements(bottleId: string): Promise<any[]> {
    return prisma.bottleMovement.findMany({
      where: { bottleId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------------------------------------------------------------------------
  // Productos generales (unidades) - Para ACCESSORY y GENERAL
  // ---------------------------------------------------------------------------

  /**
   * Calcula el stock actual de un producto general en unidades.
   * Solo aplica a productos de categoria ACCESSORY o GENERAL.
   * Los PERFUME no usan esta tabla; su stock se deriva de esencias y frascos.
   */
  async getProductStock(productId: string): Promise<number> {
    const inMovements = await prisma.productMovement.aggregate({
      where: { productId, type: "IN" },
      _sum: { quantity: true },
    });

    const outMovements = await prisma.productMovement.aggregate({
      where: { productId, type: "OUT" },
      _sum: { quantity: true },
    });

    const totalIn = inMovements._sum.quantity || 0;
    const totalOut = outMovements._sum.quantity || 0;

    return totalIn - totalOut;
  }

  /** Registra un movimiento de unidades de producto general. */
  async createProductMovement(data: {
    productId: string;
    type: string;
    quantity: number;
    reason: string;
    reference?: string;
  }): Promise<any> {
    return prisma.productMovement.create({
      data: {
        productId: data.productId,
        type: data.type as any,
        quantity: data.quantity,
        reason: data.reason as any,
        reference: data.reference,
      },
    });
  }

  /** Historial de movimientos de un producto general, mas recientes primero. */
  async getProductMovements(productId: string): Promise<any[]> {
    return prisma.productMovement.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ---------------------------------------------------------------------------
  // Auditorias de inventario
  // ---------------------------------------------------------------------------

  /** Registra una auditoria de inventario (conciliacion fisico vs sistema). */
  async createInventoryAudit(data: {
    entityType: string;
    entityId: string;
    systemValue: number;
    physicalValue: number;
    difference: number;
    notes?: string;
    userId: string;
  }): Promise<any> {
    return prisma.inventoryAudit.create({
      data: {
        entityType: data.entityType as any,
        entityId: data.entityId,
        systemValue: data.systemValue,
        physicalValue: data.physicalValue,
        difference: data.difference,
        notes: data.notes,
        userId: data.userId,
      },
    });
  }

  /** Obtiene auditorias filtradas por tipo de entidad. */
  async getAuditsByEntityType(entityType: string): Promise<any[]> {
    return prisma.inventoryAudit.findMany({
      where: { entityType: entityType as any },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Obtiene todas las auditorias de una entidad especifica. */
  async getAuditsByEntityId(entityId: string): Promise<any[]> {
    return prisma.inventoryAudit.findMany({
      where: { entityId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
