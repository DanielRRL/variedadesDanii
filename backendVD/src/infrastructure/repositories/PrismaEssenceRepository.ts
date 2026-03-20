/**
 * Implementacion del repositorio de esencias con Prisma.
 * Traduce las operaciones CRUD a consultas Prisma contra
 * la tabla "essences" incluyendo la relacion con olfactiveFamily.
 */

// prisma - Instancia singleton de PrismaClient.
import prisma from "../../config/database";

// IEssenceRepository - Contrato que esta clase implementa.
import { IEssenceRepository } from "../../domain/repositories/IEssenceRepository";

// Essence - Entidad de dominio para mapear resultados.
import { Essence } from "../../domain/entities/Essence";

export class PrismaEssenceRepository implements IEssenceRepository {
  /** Obtiene todas las esencias con su familia olfativa incluida. */
  async findAll(): Promise<Essence[]> {
    const essences = await prisma.essence.findMany({
      include: { olfactiveFamily: true },
      orderBy: { createdAt: "desc" },
    });
    return essences.map(
      (e: any) =>
        new Essence({
          id: e.id,
          name: e.name,
          description: e.description ?? undefined,
          olfactiveFamilyId: e.olfactiveFamilyId,
          inspirationBrand: e.inspirationBrand ?? undefined,
          active: e.active,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        })
    );
  }

  /** Busca una esencia por UUID con su familia olfativa. */
  async findById(id: string): Promise<Essence | null> {
    const e = await prisma.essence.findUnique({
      where: { id },
      include: { olfactiveFamily: true },
    });
    if (!e) return null;
    return new Essence({
      id: e.id,
      name: e.name,
      description: e.description ?? undefined,
      olfactiveFamilyId: e.olfactiveFamilyId,
      inspirationBrand: e.inspirationBrand ?? undefined,
      active: e.active,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    });
  }

  /** Crea una esencia nueva en la BD. */
  async create(
    essence: Omit<Essence, "id" | "createdAt" | "updatedAt">
  ): Promise<Essence> {
    const e = await prisma.essence.create({
      data: {
        name: essence.name,
        description: essence.description,
        olfactiveFamilyId: essence.olfactiveFamilyId,
        inspirationBrand: essence.inspirationBrand,
        active: essence.active,
      },
    });
    return new Essence({
      id: e.id,
      name: e.name,
      description: e.description ?? undefined,
      olfactiveFamilyId: e.olfactiveFamilyId,
      inspirationBrand: e.inspirationBrand ?? undefined,
      active: e.active,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    });
  }

  /** Actualiza solo los campos proporcionados de una esencia. */
  async update(id: string, data: Partial<Essence>): Promise<Essence> {
    const e = await prisma.essence.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.olfactiveFamilyId && {
          olfactiveFamilyId: data.olfactiveFamilyId,
        }),
        ...(data.inspirationBrand !== undefined && {
          inspirationBrand: data.inspirationBrand,
        }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    return new Essence({
      id: e.id,
      name: e.name,
      description: e.description ?? undefined,
      olfactiveFamilyId: e.olfactiveFamilyId,
      inspirationBrand: e.inspirationBrand ?? undefined,
      active: e.active,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    });
  }

  /** Elimina una esencia por UUID (hard delete). */
  async delete(id: string): Promise<void> {
    await prisma.essence.delete({ where: { id } });
  }
}
