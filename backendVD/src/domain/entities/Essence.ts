/**
 * Entidad de dominio: Esencia.
 * Representa una esencia (perfume) del catalogo de Variedades Danni.
 * Cada esencia pertenece a una familia olfativa y puede estar
 * inspirada en una marca comercial.
 * El stock de esencias se controla en mililitros mediante movimientos
 * de inventario (EssenceMovement), no con un campo directo.
 */

/** Propiedades necesarias para construir una Esencia. */
export interface EssenceProps {
  id?: string;              // UUID generado por la BD.
  name: string;             // Nombre de la esencia.
  description?: string;     // Descripcion opcional del aroma.
  olfactiveFamilyId: string;// FK a la familia olfativa (floral, amaderada, etc.).
  /** Objeto de relacion incluido cuando el repositorio hace include. */
  olfactiveFamily?: { id: string; name: string };
  inspirationBrand?: string;// Marca de inspiracion (ej: "Carolina Herrera").
  active: boolean;          // Si esta disponible en el catalogo.
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Clase de dominio Essence.
 * Modelo simple sin logica de negocio adicional;
 * la logica de stock reside en InventoryService.
 */
export class Essence {
  public readonly id?: string;
  public name: string;
  public description?: string;
  public olfactiveFamilyId: string;
  public olfactiveFamily?: { id: string; name: string };
  public inspirationBrand?: string;
  public active: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  /** Construye la entidad a partir de las propiedades recibidas. */
  constructor(props: EssenceProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.olfactiveFamilyId = props.olfactiveFamilyId;
    this.olfactiveFamily = props.olfactiveFamily;
    this.inspirationBrand = props.inspirationBrand;
    this.active = props.active;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
