/**
 * Entidad de dominio: Devolucion de Frasco.
 * Registra cuando un cliente devuelve un frasco usado.
 * La devolucion genera un descuento del 10% aplicable en el proximo pedido.
 * Esto es parte del programa de reciclaje / refill de Variedades Danni.
 */

/** Propiedades necesarias para construir una Devolucion de Frasco. */
export interface BottleReturnProps {
  id?: string;             // UUID generado por la BD.
  userId: string;          // FK al cliente que devuelve el frasco.
  bottleId: string;        // FK al tipo de frasco devuelto.
  discountApplied: number; // Porcentaje de descuento otorgado (0-100).
  notes?: string;          // Notas opcionales sobre la devolucion.
  createdAt?: Date;
}

/**
 * Clase de dominio BottleReturn.
 * Valida que el descuento este entre 0 y 100.
 */
export class BottleReturn {
  public readonly id?: string;
  public userId: string;
  public bottleId: string;
  public discountApplied: number;
  public notes?: string;
  public readonly createdAt?: Date;

  /**
   * Construye la entidad validando el rango del descuento.
   * @throws Error si discountApplied no esta entre 0 y 100.
   */
  constructor(props: BottleReturnProps) {
    if (props.discountApplied < 0 || props.discountApplied > 100) {
      throw new Error("Discount must be between 0 and 100");
    }

    this.id = props.id;
    this.userId = props.userId;
    this.bottleId = props.bottleId;
    this.discountApplied = props.discountApplied;
    this.notes = props.notes;
    this.createdAt = props.createdAt;
  }
}
