/**
 * Controlador de frascos.
 * CRUD de frascos con stock de unidades agregado a cada respuesta.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// IBottleRepository - Repositorio CRUD de frascos.
import { IBottleRepository } from "../../domain/repositories/IBottleRepository";

// InventoryService - Para consultar stock en unidades de cada frasco.
import { InventoryService } from "../../application/services/InventoryService";

// AppError - Para lanzar 404.
import { AppError } from "../../utils/AppError";

// param - Helper de Express 5.
import { param } from "../../utils/param";

export class BottleController {
  constructor(
    private readonly bottleRepo: IBottleRepository,
    private readonly inventoryService: InventoryService
  ) {}

  /** GET /bottles - Lista todos con stock en unidades. */
  getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const bottles = await this.bottleRepo.findAll();
      // Agregar stock a cada frasco en paralelo
      const withStock = await Promise.all(
        bottles.map(async (b) => ({
          ...b,
          stock: await this.inventoryService.getBottleStock(b.id!),
        }))
      );
      res.json({ success: true, data: withStock });
    } catch (error) {
      next(error);
    }
  };

  /** GET /bottles/:id - Detalle de un frasco con stock. */
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const bottle = await this.bottleRepo.findById(param(req, "id"));
      if (!bottle) {
        throw AppError.notFound("Bottle not found");
      }
      const stock = await this.inventoryService.getBottleStock(bottle.id!);
      res.json({ success: true, data: { ...bottle, stock } });
    } catch (error) {
      next(error);
    }
  };

  /** POST /bottles - Crea un frasco nuevo (activo por defecto). */
  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const bottle = await this.bottleRepo.create({
        name: req.body.name,
        type: req.body.type,
        material: req.body.material,
        capacityMl: req.body.capacityMl,
        active: true,
      });
      res.status(201).json({ success: true, data: bottle });
    } catch (error) {
      next(error);
    }
  };

  /** PATCH /bottles/:id - Actualiza campos de un frasco. */
  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const bottle = await this.bottleRepo.update(param(req, "id"), req.body);
      res.json({ success: true, data: bottle });
    } catch (error) {
      next(error);
    }
  };

  /** DELETE /bottles/:id - Elimina un frasco (hard delete). */
  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.bottleRepo.delete(param(req, "id"));
      res.json({ success: true, message: "Bottle deleted" });
    } catch (error) {
      next(error);
    }
  };
}
