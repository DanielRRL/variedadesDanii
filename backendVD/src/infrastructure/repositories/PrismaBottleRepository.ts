/**
 * Implementacion del repositorio de frascos con Prisma.
 * Traduce las operaciones CRUD a consultas contra la tabla "bottles".
 */

// prisma - Instancia singleton de PrismaClient.
import prisma from "../../config/database";

// IBottleRepository - Contrato que esta clase implementa.
import { IBottleRepository } from "../../domain/repositories/IBottleRepository";

// Bottle - Entidad de dominio para mapear resultados.
import { Bottle } from "../../domain/entities/Bottle";

export class PrismaBottleRepository implements IBottleRepository {
  /** Obtiene todos los frascos ordenados por fecha de creacion. */
  async findAll(): Promise<Bottle[]> {
    const bottles = await prisma.bottle.findMany({
      orderBy: { createdAt: "desc" },
    });
    return bottles.map(
      (b: any) =>
        new Bottle({
          id: b.id,
          name: b.name,
          type: b.type as any,
          material: b.material,
          capacityMl: b.capacityMl,
          active: b.active,
          createdAt: b.createdAt,
          updatedAt: b.updatedAt,
        })
    );
  }

  /** Busca un frasco por UUID. */
  async findById(id: string): Promise<Bottle | null> {
    const b = await prisma.bottle.findUnique({ where: { id } });
    if (!b) return null;
    return new Bottle({
      id: b.id,
      name: b.name,
      type: b.type as any,
      material: b.material,
      capacityMl: b.capacityMl,
      active: b.active,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    });
  }

  /** Crea un frasco nuevo en la BD. */
  async create(
    bottle: Omit<Bottle, "id" | "createdAt" | "updatedAt">
  ): Promise<Bottle> {
    const b = await prisma.bottle.create({
      data: {
        name: bottle.name,
        type: bottle.type as any,
        material: bottle.material,
        capacityMl: bottle.capacityMl,
        active: bottle.active,
      },
    });
    return new Bottle({
      id: b.id,
      name: b.name,
      type: b.type as any,
      material: b.material,
      capacityMl: b.capacityMl,
      active: b.active,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    });
  }

  /** Actualiza solo los campos proporcionados de un frasco. */
  async update(id: string, data: Partial<Bottle>): Promise<Bottle> {
    const b = await prisma.bottle.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type as any }),
        ...(data.material && { material: data.material }),
        ...(data.capacityMl && { capacityMl: data.capacityMl }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    return new Bottle({
      id: b.id,
      name: b.name,
      type: b.type as any,
      material: b.material,
      capacityMl: b.capacityMl,
      active: b.active,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    });
  }

  /** Elimina un frasco por UUID (hard delete). */
  async delete(id: string): Promise<void> {
    await prisma.bottle.delete({ where: { id } });
  }
}
