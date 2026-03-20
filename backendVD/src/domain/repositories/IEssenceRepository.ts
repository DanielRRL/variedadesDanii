/**
 * Interface del repositorio de Esencias.
 * Define operaciones CRUD sobre esencias del catalogo.
 */

// Essence - Entidad de dominio usada como tipo de retorno y parametro.
import { Essence } from "../entities/Essence";

/** Contrato del repositorio de esencias. */
export interface IEssenceRepository {
  /** Obtiene todas las esencias con su familia olfativa. */
  findAll(): Promise<Essence[]>;

  /** Busca una esencia por UUID. Retorna null si no existe. */
  findById(id: string): Promise<Essence | null>;

  /** Crea una esencia nueva (sin id ni timestamps). */
  create(essence: Omit<Essence, "id" | "createdAt" | "updatedAt">): Promise<Essence>;

  /** Actualiza campos parciales de una esencia. */
  update(id: string, data: Partial<Essence>): Promise<Essence>;

  /** Elimina una esencia por UUID. */
  delete(id: string): Promise<void>;
}
