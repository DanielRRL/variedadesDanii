/**
 * Controlador de inventario.
 * Expone consultas de stock y registro de movimientos (IN/OUT)
 * para esencias, frascos y productos generales.
 * Incluye endpoints de auditoria de inventario.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// InventoryService - Servicio de inventario con validaciones.
import { InventoryService } from "../../application/services/InventoryService";

// param - Helper de Express 5.
import { param } from "../../utils/param";

export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ---------------------------------------------------------------------------
  // Esencias (ml)
  // ---------------------------------------------------------------------------

  /** GET /inventory/essence/:essenceId/stock - Stock en ml de una esencia. */
  getEssenceStock = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const essenceId = param(req, "essenceId");
      const stock = await this.inventoryService.getEssenceStock(essenceId);
      res.json({ success: true, data: { essenceId, stockMl: stock } });
    } catch (error) {
      next(error);
    }
  };

  /** POST /inventory/essence/movement - Crea movimiento de esencia (IN o OUT). */
  createEssenceMovement = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { essenceId, type, ml, reason, reference } = req.body;
      let movement;

      if (type === "IN") {
        movement = await this.inventoryService.registerEssenceEntry(
          essenceId, ml, reason, reference
        );
      } else {
        movement = await this.inventoryService.registerEssenceExit(
          essenceId, ml, reason, reference
        );
      }

      res.status(201).json({ success: true, data: movement });
    } catch (error) {
      next(error);
    }
  };

  /** GET /inventory/essence/:essenceId/movements - Historial de movimientos. */
  getEssenceMovements = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const movements = await this.inventoryService.getEssenceMovements(
        param(req, "essenceId")
      );
      res.json({ success: true, data: movements });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /inventory/essence/:essenceId/movements
   * Ruta alternativa que toma essenceId del URL param.
   * Mapea razones legibles a enum values del backend.
   */
  private static REASON_MAP: Record<string, string> = {
    "Compra a proveedor": "PURCHASE",
    "Ajuste de inventario": "ADJUSTMENT",
    "Merma / evaporación": "ADJUSTMENT",
    "Devolución parcial": "RETURN",
    "Muestra al cliente": "SALE",
    "Pérdida / daño": "ADJUSTMENT",
    "Otro": "ADJUSTMENT",
  };

  createEssenceMovementByParam = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const essenceId = param(req, "essenceId");
      const { type, ml, reason, notes } = req.body;

      if (!type || !["IN", "OUT"].includes(type)) {
        res.status(400).json({ success: false, message: "type must be IN or OUT" });
        return;
      }
      if (!ml || ml <= 0) {
        res.status(400).json({ success: false, message: "ml must be greater than 0" });
        return;
      }

      // Map human-readable reason to enum value, fallback to raw value
      const mappedReason = InventoryController.REASON_MAP[reason] || reason || (type === "IN" ? "PURCHASE" : "SALE");

      let movement;
      if (type === "IN") {
        movement = await this.inventoryService.registerEssenceEntry(
          essenceId, ml, mappedReason, notes
        );
      } else {
        movement = await this.inventoryService.registerEssenceExit(
          essenceId, ml, mappedReason, notes
        );
      }

      res.status(201).json({ success: true, data: movement });
    } catch (error) {
      next(error);
    }
  };

  // ---------------------------------------------------------------------------
  // Frascos (unidades)
  // ---------------------------------------------------------------------------

  /** GET /inventory/bottle/:bottleId/stock - Stock en unidades de un frasco. */
  getBottleStock = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const bottleId = param(req, "bottleId");
      const stock = await this.inventoryService.getBottleStock(bottleId);
      res.json({ success: true, data: { bottleId, stock } });
    } catch (error) {
      next(error);
    }
  };

  /** POST /inventory/bottle/movement - Crea movimiento de frasco (IN o OUT). */
  createBottleMovement = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { bottleId, type, quantity, reason, reference } = req.body;
      let movement;

      if (type === "IN") {
        movement = await this.inventoryService.registerBottleEntry(
          bottleId, quantity, reason, reference
        );
      } else {
        movement = await this.inventoryService.registerBottleExit(
          bottleId, quantity, reason, reference
        );
      }

      res.status(201).json({ success: true, data: movement });
    } catch (error) {
      next(error);
    }
  };

  /** GET /inventory/bottle/:bottleId/movements - Historial de movimientos. */
  getBottleMovements = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const movements = await this.inventoryService.getBottleMovements(
        param(req, "bottleId")
      );
      res.json({ success: true, data: movements });
    } catch (error) {
      next(error);
    }
  };

  // ---------------------------------------------------------------------------
  // Productos generales (unidades) - ACCESSORY y GENERAL
  // ---------------------------------------------------------------------------

  /** GET /inventory/product/:productId/stock - Stock en unidades de un producto. */
  getProductStock = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const productId = param(req, "productId");
      const stock = await this.inventoryService.getProductStock(productId);
      res.json({ success: true, data: { productId, stock } });
    } catch (error) {
      next(error);
    }
  };

  /** POST /inventory/product/movement - Crea movimiento de producto (IN o OUT). */
  createProductMovement = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { productId, type, quantity, reason, reference } = req.body;
      let movement;

      if (type === "IN") {
        movement = await this.inventoryService.registerProductEntry(
          productId, quantity, reason, reference
        );
      } else {
        movement = await this.inventoryService.registerProductExit(
          productId, quantity, reason, reference
        );
      }

      res.status(201).json({ success: true, data: movement });
    } catch (error) {
      next(error);
    }
  };

  /** GET /inventory/product/:productId/movements - Historial de movimientos. */
  getProductMovements = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const movements = await this.inventoryService.getProductMovements(
        param(req, "productId")
      );
      res.json({ success: true, data: movements });
    } catch (error) {
      next(error);
    }
  };

  // ---------------------------------------------------------------------------
  // Auditorias de inventario
  // ---------------------------------------------------------------------------

  /**
   * POST /inventory/audit
   * Realiza una auditoria comparando conteo fisico vs sistema.
   * Si hay diferencia, crea movimiento de ajuste automaticamente.
   */
  createAudit = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { entityType, entityId, physicalValue, notes } = req.body;
      // userId del token JWT (auth middleware lo inyecta)
      const userId = (req as any).user.id;

      const audit = await this.inventoryService.performAudit(
        entityType, entityId, physicalValue, userId, notes
      );

      res.status(201).json({ success: true, data: audit });
    } catch (error) {
      next(error);
    }
  };

  /** GET /inventory/audit/:entityType - Auditorias por tipo de entidad. */
  getAuditsByEntityType = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const audits = await this.inventoryService.getAuditsByEntityType(
        param(req, "entityType")
      );
      res.json({ success: true, data: audits });
    } catch (error) {
      next(error);
    }
  };

  /** GET /inventory/audit/entity/:entityId - Auditorias de una entidad especifica. */
  getAuditsByEntityId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const audits = await this.inventoryService.getAuditsByEntityId(
        param(req, "entityId")
      );
      res.json({ success: true, data: audits });
    } catch (error) {
      next(error);
    }
  };
}
