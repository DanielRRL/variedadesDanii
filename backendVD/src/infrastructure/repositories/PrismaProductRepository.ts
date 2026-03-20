/**
 * Implementacion del repositorio de productos con Prisma.
 * Soporta tres categorias de producto:
 * - PERFUME: esencia + frasco + ml (incluye relaciones anidadas).
 * - ACCESSORY: accesorios sin esencia ni frasco.
 * - GENERAL: otros productos del negocio.
 * El delete es soft (desactiva el producto en vez de borrarlo).
 */

// prisma - Instancia singleton de PrismaClient.
import prisma from "../../config/database";

// IProductRepository - Contrato que esta clase implementa.
import { IProductRepository } from "../../domain/repositories/IProductRepository";

// Product - Entidad de dominio para mapear resultados.
import { Product } from "../../domain/entities/Product";

/** Helper para mapear un registro de Prisma a entidad Product. */
function toProduct(p: any): Product {
  return new Product({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    essenceId: p.essenceId,
    bottleId: p.bottleId,
    mlQuantity: p.mlQuantity,
    price: p.price,
    active: p.active,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  });
}

export class PrismaProductRepository implements IProductRepository {
  /** Obtiene productos activos como entidades de dominio (sin relaciones). */
  async findAll(): Promise<Product[]> {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
    return products.map(toProduct);
  }

  /**
   * Obtiene productos con relaciones incluidas.
   * Para PERFUME incluye esencia (+ familia olfativa) y frasco.
   * Para otros, essence y bottle seran null.
   */
  async findAllWithRelations(): Promise<any[]> {
    return prisma.product.findMany({
      where: { active: true },
      include: {
        essence: { include: { olfactiveFamily: true } },
        bottle: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Busca un producto por UUID como entidad de dominio. */
  async findById(id: string): Promise<Product | null> {
    const p = await prisma.product.findUnique({ where: { id } });
    if (!p) return null;
    return toProduct(p);
  }

  /** Busca un producto por UUID con esencia y frasco incluidos. */
  async findByIdWithRelations(id: string): Promise<any | null> {
    return prisma.product.findUnique({
      where: { id },
      include: {
        essence: { include: { olfactiveFamily: true } },
        bottle: true,
      },
    });
  }

  /** Crea un producto nuevo en la BD. */
  async create(
    product: Omit<Product, "id" | "createdAt" | "updatedAt">
  ): Promise<Product> {
    const p = await prisma.product.create({
      data: {
        name: product.name,
        description: product.description,
        category: (product.category as any) || "PERFUME",
        essenceId: product.essenceId || undefined,
        bottleId: product.bottleId || undefined,
        mlQuantity: product.mlQuantity || undefined,
        price: product.price,
        active: product.active,
      },
    });
    return toProduct(p);
  }

  /** Actualiza solo los campos proporcionados de un producto. */
  async update(id: string, data: Partial<Product>): Promise<Product> {
    const p = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category && { category: data.category as any }),
        ...(data.essenceId !== undefined && { essenceId: data.essenceId || undefined }),
        ...(data.bottleId !== undefined && { bottleId: data.bottleId || undefined }),
        ...(data.mlQuantity !== undefined && { mlQuantity: data.mlQuantity || undefined }),
        ...(data.price && { price: data.price }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    return toProduct(p);
  }

  /** Soft delete: desactiva el producto en vez de borrarlo. */
  async delete(id: string): Promise<void> {
    await prisma.product.update({
      where: { id },
      data: { active: false },
    });
  }
}
