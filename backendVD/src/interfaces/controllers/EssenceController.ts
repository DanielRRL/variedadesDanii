/**
 * Controlador de esencias.
 * CRUD de esencias con stock actual agregado a cada respuesta.
 * El stock se calcula con InventoryService (SUM IN - SUM OUT).
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// IEssenceRepository - Repositorio CRUD de esencias.
import { IEssenceRepository } from "../../domain/repositories/IEssenceRepository";

// InventoryService - Para consultar stock en ml de cada esencia.
import { InventoryService } from "../../application/services/InventoryService";

// AppError - Para lanzar 404.
import { AppError } from "../../utils/AppError";

// param - Helper de Express 5.
import { param } from "../../utils/param";

export class EssenceController {
  constructor(
    private readonly essenceRepo: IEssenceRepository,
    private readonly inventoryService: InventoryService
  ) {}

  /** GET /essences - Lista todas con stock actual en ml. */
  getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const essences = await this.essenceRepo.findAll();
      // Agregar stockMl a cada esencia en paralelo
      const withStock = await Promise.all(
        essences.map(async (e) => ({
          ...e,
          stockMl: await this.inventoryService.getEssenceStock(e.id!),
        }))
      );
      res.json({ success: true, data: withStock });
    } catch (error) {
      next(error);
    }
  };

  /** GET /essences/:id - Detalle de una esencia con stock. */
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const essence = await this.essenceRepo.findById(param(req, "id"));
      if (!essence) {
        throw AppError.notFound("Essence not found");
      }
      const stock = await this.inventoryService.getEssenceStock(essence.id!);
      res.json({ success: true, data: { ...essence, stockMl: stock } });
    } catch (error) {
      next(error);
    }
  };

  /** POST /essences - Crea una esencia nueva (activa por defecto). */
  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const essence = await this.essenceRepo.create({
        name: req.body.name,
        description: req.body.description,
        olfactiveFamilyId: req.body.olfactiveFamilyId,
        inspirationBrand: req.body.inspirationBrand,
        active: true,
      });
      res.status(201).json({ success: true, data: essence });
    } catch (error) {
      next(error);
    }
  };

  /** PATCH /essences/:id - Actualiza campos de una esencia. */
  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const essence = await this.essenceRepo.update(param(req, "id"), req.body);
      res.json({ success: true, data: essence });
    } catch (error) {
      next(error);
    }
  };

  /** DELETE /essences/:id - Elimina una esencia. */
  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.essenceRepo.delete(param(req, "id"));
      res.json({ success: true, message: "Essence deleted" });
    } catch (error) {
      next(error);
    }
  };
}
