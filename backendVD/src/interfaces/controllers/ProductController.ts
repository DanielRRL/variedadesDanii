/**
 * Controlador de productos.
 * Un producto puede ser:
 * - PERFUME: esencia + frasco + ml + precio (legado).
 * - LOTION/CREAM/SHAMPOO/MAKEUP/SPLASH: productos vendibles que generan gramos.
 * - ACCESSORY: accesorios sin gramos.
 * - ESSENCE_CATALOG: esencias canjeables (precio=0, sin stock unitario).
 * GET publicos. POST/PATCH/DELETE y admin CRUD solo ADMIN con validacion.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// IProductRepository - Repositorio de productos con metodos WithRelations.
import { IProductRepository } from "../../domain/repositories/IProductRepository";

// prisma - Para operaciones directas de ProductMovement y admin queries.
import prisma from "../../config/database";

// AppError - Para lanzar 404 si el producto no existe.
import { AppError } from "../../utils/AppError";

// param - Helper de Express 5 para extraer params.
import { param } from "../../utils/param";

// logger - Logger para operaciones de stock.
import logger from "../../utils/logger";

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

  // ── Admin CRUD (nuevos tipos de producto con gamificacion) ─────────────

  /** Valores validos para productType en el sistema de gamificacion. */
  private static VALID_PRODUCT_TYPES = [
    "LOTION", "CREAM", "SHAMPOO", "MAKEUP", "SPLASH", "ACCESSORY", "ESSENCE_CATALOG",
  ];

  /**
   * POST /api/admin/products — ADMIN only
   * Crea un producto nuevo con el schema extendido (productType, generatesGram, etc.).
   * Body: { name, description?, productType, price, stockUnits, generatesGram, photoUrl?, category? }
   * ESSENCE_CATALOG: price=0, stockUnits gestionado via EssenceMovement.
   */
  adminCreate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        name, description, productType, price, stockUnits,
        generatesGram, photoUrl, category,
      } = req.body;

      // Validaciones
      if (!name || !productType) {
        throw AppError.badRequest("name and productType are required.");
      }
      if (!ProductController.VALID_PRODUCT_TYPES.includes(productType)) {
        throw AppError.badRequest(
          `productType must be one of: ${ProductController.VALID_PRODUCT_TYPES.join(", ")}`
        );
      }
      if (productType !== "ESSENCE_CATALOG" && (price === undefined || price <= 0)) {
        throw AppError.badRequest("price must be greater than 0 for sellable products.");
      }
      if (stockUnits !== undefined && stockUnits < 0) {
        throw AppError.badRequest("stockUnits cannot be negative.");
      }

      const product = await prisma.product.create({
        data: {
          name,
          description: description || null,
          category: category || "GENERAL",
          productType: productType as any,
          price: productType === "ESSENCE_CATALOG" ? 0 : price,
          stockUnits: stockUnits ?? 0,
          generatesGram: generatesGram ?? (productType !== "ACCESSORY" && productType !== "ESSENCE_CATALOG"),
          photoUrl: photoUrl || null,
          active: true,
        },
      });

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/admin/products/:id — ADMIN only
   * Actualiza campos parciales de un producto.
   * Body: partial of { name, description, productType, price, stockUnits, generatesGram, photoUrl, active }
   */
  adminUpdate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = param(req, "id");
      const {
        name, description, productType, price, stockUnits,
        generatesGram, photoUrl, active, category,
      } = req.body;

      // Validar productType si se envia
      if (productType && !ProductController.VALID_PRODUCT_TYPES.includes(productType)) {
        throw AppError.badRequest(
          `productType must be one of: ${ProductController.VALID_PRODUCT_TYPES.join(", ")}`
        );
      }
      if (price !== undefined && price <= 0) {
        throw AppError.badRequest("price must be greater than 0.");
      }
      if (stockUnits !== undefined && stockUnits < 0) {
        throw AppError.badRequest("stockUnits cannot be negative.");
      }

      const product = await prisma.product.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(category !== undefined && { category: category as any }),
          ...(productType !== undefined && { productType: productType as any }),
          ...(price !== undefined && { price }),
          ...(stockUnits !== undefined && { stockUnits }),
          ...(generatesGram !== undefined && { generatesGram }),
          ...(photoUrl !== undefined && { photoUrl }),
          ...(active !== undefined && { active }),
        },
      });

      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/admin/products/:id/toggle — ADMIN only
   * Invierte el estado active del producto (true ↔ false).
   */
  adminToggleActive = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = param(req, "id");
      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Product not found");
      }

      const product = await prisma.product.update({
        where: { id },
        data: { active: !existing.active },
      });

      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/products?page=1&limit=20&type=LOTION&active=true — ADMIN only
   * Lista todos los productos (incluyendo inactivos) con filtros opcionales.
   * Incluye stock y datos de ventas.
   */
  adminGetAll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page  = parseInt(String(req.query.page  ?? "1"),  10);
      const limit = parseInt(String(req.query.limit ?? "20"), 10);
      const type  = req.query.type as string | undefined;
      const active = req.query.active as string | undefined;

      const where: any = {};
      if (type) where.productType = type;
      if (active !== undefined) where.active = active === "true";

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            essence: { select: { id: true, name: true } },
            bottle: { select: { id: true, name: true } },
            _count: { select: { orderItems: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.product.count({ where }),
      ]);

      res.json({
        success: true,
        data: { products, total, page, limit },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/products/:id/stock — ADMIN only
   * Agrega stock a un producto creando un ProductMovement IN.
   * Body: { quantity: number, notes?: string }
   */
  adminAddStock = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = param(req, "id");
      const { quantity, notes } = req.body;

      if (!quantity || typeof quantity !== "number" || quantity <= 0) {
        throw AppError.badRequest("quantity must be a positive number.");
      }

      // Verificar que el producto existe
      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        throw AppError.notFound("Product not found");
      }

      // Transaccion: crear movimiento + actualizar stock
      const [movement, product] = await prisma.$transaction([
        prisma.productMovement.create({
          data: {
            productId: id,
            type: "IN",
            quantity,
            reason: "ADJUSTMENT",
            reference: notes || null,
          },
        }),
        prisma.product.update({
          where: { id },
          data: { stockUnits: { increment: quantity } },
        }),
      ]);

      logger.info("Stock agregado a producto", {
        productId: id,
        quantity,
        newStock: product.stockUnits,
      });

      res.json({
        success: true,
        data: { product, movement },
      });
    } catch (error) {
      next(error);
    }
  };
}
