/**
 * Controlador de esencias.
 * CRUD de esencias con stock actual agregado a cada respuesta.
 * El stock se calcula con InventoryService (SUM IN - SUM OUT).
 * Soporta casa (House), etiquetas olfativas y pricePerMl.
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

// prisma - Para operaciones directas (houses, families).
import prisma from "../../config/database";

// bcrypt - Para verificar la contraseña del admin al eliminar.
import bcrypt from "bcrypt";

export class EssenceController {
  constructor(
    private readonly essenceRepo: IEssenceRepository,
    private readonly inventoryService: InventoryService
  ) {}

  /** GET /essences/families - Lista todas las familias olfativas. */
  getFamilies = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const families = await this.essenceRepo.findAllFamilies();
      res.json({ success: true, data: families });
    } catch (error) {
      next(error);
    }
  };

  /** POST /essences/families - Crea una familia olfativa nueva (ADMIN). */
  createFamily = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { name } = req.body;
      if (!name) throw AppError.badRequest("name is required");
      const family = await prisma.olfactiveFamily.create({ data: { name } });
      res.status(201).json({ success: true, data: family });
    } catch (error) {
      next(error);
    }
  };

  // ── Houses (casas / marcas) ──────────────────────────────────────────

  /** GET /essences/houses - Lista todas las casas. */
  getHouses = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const houses = await prisma.house.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      });
      res.json({ success: true, data: houses });
    } catch (error) {
      next(error);
    }
  };

  /** POST /essences/houses - Crea una casa nueva (ADMIN). */
  createHouse = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { name, handle, description, logoUrl } = req.body;
      if (!name || !handle) throw AppError.badRequest("name and handle are required");
      // Sanitize handle: lowercase, no spaces, no @
      const cleanHandle = handle.toLowerCase().replace(/[@\s]/g, "");
      const house = await prisma.house.create({
        data: { name, handle: cleanHandle, description, logoUrl },
      });
      res.status(201).json({ success: true, data: house });
    } catch (error) {
      next(error);
    }
  };

  // ── Essence CRUD ─────────────────────────────────────────────────────

  /** GET /essences - Lista todas con stock actual en ml. */
  getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const essences = await this.essenceRepo.findAll();
      // Agregar currentStockMl a cada esencia en paralelo.
      const withStock = await Promise.all(
        essences.map(async (e) => ({
          ...e,
          currentStockMl: await this.inventoryService.getEssenceStock(e.id!),
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
      res.json({ success: true, data: { ...essence, currentStockMl: stock } });
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
      const { name, description, olfactiveFamilyId, inspirationBrand, houseId, pricePerMl, tagIds } = req.body;
      if (!name || !olfactiveFamilyId) {
        throw AppError.badRequest("name and olfactiveFamilyId are required");
      }
      const essence = await this.essenceRepo.create({
        name,
        description,
        olfactiveFamilyId,
        inspirationBrand,
        houseId: houseId || undefined,
        pricePerMl: pricePerMl ? Number(pricePerMl) : undefined,
        olfactiveTags: tagIds ? tagIds.map((id: string) => ({ id, name: "" })) : [],
        active: true,
      });
      // Return with stock = 0 (just created)
      res.status(201).json({ success: true, data: { ...essence, currentStockMl: 0 } });
    } catch (error) {
      next(error);
    }
  };

  /** PUT /essences/:id - Actualiza campos de una esencia. */
  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { tagIds, ...rest } = req.body;
      const data: any = { ...rest };
      if (tagIds) {
        data.olfactiveTags = tagIds.map((id: string) => ({ id, name: "" }));
      }
      if (data.pricePerMl !== undefined) {
        data.pricePerMl = data.pricePerMl ? Number(data.pricePerMl) : null;
      }
      const essence = await this.essenceRepo.update(param(req, "id"), data);
      const stock = await this.inventoryService.getEssenceStock(essence.id!);
      res.json({ success: true, data: { ...essence, currentStockMl: stock } });
    } catch (error) {
      next(error);
    }
  };

  /** DELETE /essences/:id - Elimina una esencia. Requiere password del admin. */
  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = param(req, "id");
      const { password } = req.body;

      if (!password) {
        throw AppError.badRequest("Admin password is required to delete an essence.");
      }

      // Verify admin password
      const adminUser = await prisma.user.findUnique({ where: { id: (req as any).userId } });
      if (!adminUser) {
        throw AppError.unauthorized("User not found.");
      }
      const valid = await bcrypt.compare(password, adminUser.password);
      if (!valid) {
        throw AppError.unauthorized("Contraseña incorrecta.");
      }

      // Check essence exists
      const existing = await prisma.essence.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Essence not found");
      }

      // Delete related records in a transaction, then the essence
      await prisma.$transaction([
        prisma.essenceMovement.deleteMany({ where: { essenceId: id } }),
        prisma.essenceOlfactiveTag.deleteMany({ where: { essenceId: id } }),
        prisma.product.updateMany({ where: { essenceId: id }, data: { essenceId: null } }),
        prisma.essence.delete({ where: { id } }),
      ]);

      res.json({ success: true, message: "Essence deleted" });
    } catch (error) {
      next(error);
    }
  };
}
