/**
 * Controlador de productos.
 * Un producto puede ser:
 * - PERFUME: esencia + frasco + ml + precio.
 * - ACCESSORY o GENERAL: nombre + precio + descripcion.
 * GET publicos. POST/PATCH/DELETE solo ADMIN con validacion.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// IProductRepository - Repositorio de productos con metodos WithRelations.
import { IProductRepository } from "../../domain/repositories/IProductRepository";

// AppError - Para lanzar 404 si el producto no existe.
import { AppError } from "../../utils/AppError";

// param - Helper de Express 5 para extraer params.
import { param } from "../../utils/param";

export class ProductController {
  constructor(private readonly productRepo: IProductRepository) {}

  /** GET /products - Lista productos activos con relaciones incluidas. */
  getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const products = await this.productRepo.findAllWithRelations();
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  };

  /** GET /products/:id - Un producto con relaciones. */
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const product = await this.productRepo.findByIdWithRelations(
        param(req, "id")
      );
      if (!product) {
        throw AppError.notFound("Product not found");
      }
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /products - Crea un producto nuevo (activo por defecto).
   * El body varia segun category:
   * - PERFUME: name, category, price, essenceId, bottleId, mlQuantity (requeridos).
   * - ACCESSORY / GENERAL: name, category, price (requeridos), description (opcional).
   */
  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { name, description, category, essenceId, bottleId, mlQuantity, price } = req.body;

      const product = await this.productRepo.create({
        name,
        description,
        category,
        essenceId: category === "PERFUME" ? essenceId : undefined,
        bottleId: category === "PERFUME" ? bottleId : undefined,
        mlQuantity: category === "PERFUME" ? mlQuantity : undefined,
        price,
        active: true,
        isPerfume() { return this.category === "PERFUME"; },
      });

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  /** PATCH /products/:id - Actualiza campos de un producto. */
  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const product = await this.productRepo.update(param(req, "id"), req.body);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  /** DELETE /products/:id - Soft delete (desactiva el producto). */
  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.productRepo.delete(param(req, "id"));
      res.json({ success: true, message: "Product deactivated" });
    } catch (error) {
      next(error);
    }
  };
}
