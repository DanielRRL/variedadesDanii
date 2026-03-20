/**
 * Interface del repositorio de Frascos.
 * Define operaciones CRUD sobre tipos de frascos.
 */

// Bottle - Entidad de dominio usada como tipo de retorno y parametro.
import { Bottle } from "../entities/Bottle";

/** Contrato del repositorio de frascos. */
export interface IBottleRepository {
  /** Obtiene todos los frascos ordenados por fecha de creacion. */
  findAll(): Promise<Bottle[]>;

  /** Busca un frasco por UUID. Retorna null si no existe. */
  findById(id: string): Promise<Bottle | null>;

  /** Crea un frasco nuevo (sin id ni timestamps). */
  create(bottle: Omit<Bottle, "id" | "createdAt" | "updatedAt">): Promise<Bottle>;

  /** Actualiza campos parciales de un frasco. */
  update(id: string, data: Partial<Bottle>): Promise<Bottle>;

  /** Elimina un frasco por UUID. */
  delete(id: string): Promise<void>;
}
