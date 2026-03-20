/**
 * Entidad de dominio: Producto.
 * Un producto puede ser de tres categorias:
 * - PERFUME: combinacion esencia + frasco + ml. Es el producto principal del negocio.
 * - ACCESSORY: accesorios como atomizadores, cajas de regalo, etc.
 * - GENERAL: cualquier otro producto que la empresa maneje.
 *
 * Para PERFUME se requiere essenceId, bottleId y mlQuantity.
 * Para ACCESSORY y GENERAL solo se necesita name, price y category.
 * El stock de productos no-PERFUME se controla con ProductMovement (unidades).
 * El stock de PERFUME se controla con EssenceMovement (ml) y BottleMovement (unidades).
 */

/** Categorias de producto soportadas por el sistema. */
export enum ProductCategory {
  PERFUME = "PERFUME",
  ACCESSORY = "ACCESSORY",
  GENERAL = "GENERAL",
}

/** Propiedades necesarias para construir un Producto. */
export interface ProductProps {
  id?: string;
  name: string;               // Nombre visible del producto.
  description?: string | null; // Descripcion opcional.
  category: string;           // PERFUME, ACCESSORY o GENERAL.
  essenceId?: string | null;  // FK a esencia (solo PERFUME).
  bottleId?: string | null;   // FK a frasco (solo PERFUME).
  mlQuantity?: number | null; // Cantidad en ml (solo PERFUME).
  price: number;              // Precio en pesos colombianos.
  active: boolean;            // Si esta disponible para venta.
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Clase de dominio Product.
 * Valida reglas de negocio en el constructor:
 * - Price siempre debe ser positivo.
 * - PERFUME requiere essenceId, bottleId y mlQuantity > 0.
 */
export class Product {
  public readonly id?: string;
  public name: string;
  public description?: string | null;
  public category: string;
  public essenceId?: string | null;
  public bottleId?: string | null;
  public mlQuantity?: number | null;
  public price: number;
  public active: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(props: ProductProps) {
    if (props.price <= 0) {
      throw new Error("price must be greater than 0");
    }

    // PERFUME requiere esencia, frasco y cantidad en ml
    if (props.category === ProductCategory.PERFUME) {
      if (!props.essenceId) {
        throw new Error("essenceId is required for PERFUME products");
      }
      if (!props.bottleId) {
        throw new Error("bottleId is required for PERFUME products");
      }
      if (!props.mlQuantity || props.mlQuantity <= 0) {
        throw new Error("mlQuantity must be greater than 0 for PERFUME products");
      }
    }

    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.category = props.category;
    this.essenceId = props.essenceId;
    this.bottleId = props.bottleId;
    this.mlQuantity = props.mlQuantity;
    this.price = props.price;
    this.active = props.active;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** Indica si el producto es un perfume artesanal (esencia + frasco). */
  isPerfume(): boolean {
    return this.category === ProductCategory.PERFUME;
  }
}
