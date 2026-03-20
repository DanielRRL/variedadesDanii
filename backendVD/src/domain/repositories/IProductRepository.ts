/**
 * Interface del repositorio de Productos.
 * Un producto es la combinacion esencia + frasco + ml.
 * Incluye metodos "WithRelations" que retornan datos anidados
 * (esencia con familia olfativa, frasco) utiles para la API.
 */

// Product - Entidad de dominio usada como tipo de retorno.
import { Product } from "../entities/Product";

/** Contrato del repositorio de productos. */
export interface IProductRepository {
  /** Obtiene todos los productos activos (sin relaciones anidadas). */
  findAll(): Promise<Product[]>;

  /** Obtiene productos con esencia, familia olfativa y frasco incluidos. */
  findAllWithRelations(): Promise<any[]>;

  /** Busca un producto por UUID (sin relaciones). */
  findById(id: string): Promise<Product | null>;

  /** Busca un producto por UUID incluyendo esencia y frasco. */
  findByIdWithRelations(id: string): Promise<any | null>;

  /** Crea un producto nuevo (sin id ni timestamps). */
  create(product: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<Product>;

  /** Actualiza campos parciales de un producto. */
  update(id: string, data: Partial<Product>): Promise<Product>;

  /** Desactiva un producto (soft delete). */
  delete(id: string): Promise<void>;
}
