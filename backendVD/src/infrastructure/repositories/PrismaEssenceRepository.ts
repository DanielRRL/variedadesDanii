/**
 * Implementacion del repositorio de esencias con Prisma.
 * Traduce las operaciones CRUD a consultas Prisma contra
 * la tabla "essences" incluyendo la relacion con olfactiveFamily, house y tags.
 */

// prisma - Instancia singleton de PrismaClient.
import prisma from "../../config/database";

// IEssenceRepository - Contrato que esta clase implementa.
import { IEssenceRepository } from "../../domain/repositories/IEssenceRepository";

// Essence - Entidad de dominio para mapear resultados.
import { Essence } from "../../domain/entities/Essence";

/** Include comun para todas las consultas de esencia. */
const ESSENCE_INCLUDE = {
  olfactiveFamily: true,
  house: true,
  olfactiveTags: {
    include: { olfactiveFamily: true },
  },
} as const;

/** Mapea un registro Prisma a la entidad de dominio Essence. */
function toEntity(e: any): Essence {
  return new Essence({
    id: e.id,
    name: e.name,
    description: e.description ?? undefined,
    olfactiveFamilyId: e.olfactiveFamilyId,
    olfactiveFamily: e.olfactiveFamily
      ? { id: e.olfactiveFamily.id, name: e.olfactiveFamily.name }
      : undefined,
    inspirationBrand: e.inspirationBrand ?? undefined,
    houseId: e.houseId ?? undefined,
    house: e.house
      ? { id: e.house.id, name: e.house.name, handle: e.house.handle }
      : undefined,
    pricePerMl: e.pricePerMl ?? undefined,
    olfactiveTags: e.olfactiveTags
      ? e.olfactiveTags.map((t: any) => ({
          id: t.olfactiveFamily.id,
          name: t.olfactiveFamily.name,
        }))
      : [],
    active: e.active,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}

export class PrismaEssenceRepository implements IEssenceRepository {
  /** Obtiene todas las esencias con relaciones incluidas. */
  async findAll(): Promise<Essence[]> {
    const essences = await prisma.essence.findMany({
      include: ESSENCE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return essences.map(toEntity);
  }

  /** Busca una esencia por UUID con relaciones. */
  async findById(id: string): Promise<Essence | null> {
    const e = await prisma.essence.findUnique({
      where: { id },
      include: ESSENCE_INCLUDE,
    });
    if (!e) return null;
    return toEntity(e);
  }

  /** Crea una esencia nueva en la BD con tags opcionales. */
  async create(
    essence: Omit<Essence, "id" | "createdAt" | "updatedAt">
  ): Promise<Essence> {
    const e = await prisma.essence.create({
      data: {
        name: essence.name,
        description: essence.description,
        olfactiveFamilyId: essence.olfactiveFamilyId,
        inspirationBrand: essence.inspirationBrand,
        houseId: essence.houseId || null,
        pricePerMl: essence.pricePerMl ?? null,
        active: essence.active,
        ...(essence.olfactiveTags && essence.olfactiveTags.length > 0
          ? {
              olfactiveTags: {
                create: essence.olfactiveTags.map((t) => ({
                  olfactiveFamilyId: t.id,
                })),
              },
            }
          : {}),
      },
      include: ESSENCE_INCLUDE,
    });
    return toEntity(e);
  }

  /** Actualiza campos parciales de una esencia, incluyendo tags. */
  async update(id: string, data: Partial<Essence>): Promise<Essence> {
    // Si se envian tags, eliminar los existentes y crear los nuevos
    if (data.olfactiveTags) {
      await prisma.essenceOlfactiveTag.deleteMany({ where: { essenceId: id } });
      if (data.olfactiveTags.length > 0) {
        await prisma.essenceOlfactiveTag.createMany({
          data: data.olfactiveTags.map((t) => ({
            essenceId: id,
            olfactiveFamilyId: t.id,
          })),
        });
      }
    }

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
        ...(data.houseId !== undefined && { houseId: data.houseId || null }),
        ...(data.pricePerMl !== undefined && { pricePerMl: data.pricePerMl }),
        ...(data.active !== undefined && { active: data.active }),
      },
      include: ESSENCE_INCLUDE,
    });
    return toEntity(e);
  }

  /** Elimina una esencia por UUID (hard delete). */
  async delete(id: string): Promise<void> {
    await prisma.essence.delete({ where: { id } });
  }

  /** Retorna todas las familias olfativas ordenadas por nombre. */
  async findAllFamilies(): Promise<{ id: string; name: string }[]> {
    return prisma.olfactiveFamily.findMany({ orderBy: { name: 'asc' } });
  }
}
