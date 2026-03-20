/**
 * Entidad de dominio: Movimiento de Frasco.
 * Registra cada entrada (IN) o salida (OUT) de unidades de un tipo de frasco.
 * El stock actual se calcula como: SUM(IN) - SUM(OUT) de todos los movimientos.
 * Funciona igual que EssenceMovement pero en unidades enteras en vez de ml.
 */

/** Tipo de movimiento de frasco: entrada o salida. */
export enum BottleMovementType {
  IN = "IN",   // Entrada: compra de frascos, devolucion de cliente.
  OUT = "OUT", // Salida: uso en pedido, ajuste negativo.
}

/** Razon del movimiento de frasco. */
export enum BottleMovementReason {
  PURCHASE = "PURCHASE",     // Compra de frascos a proveedor.
  SALE = "SALE",             // Frasco usado en un pedido.
  RETURN = "RETURN",         // Devolucion de frasco por el cliente.
  ADJUSTMENT = "ADJUSTMENT", // Ajuste manual de inventario.
}

/** Propiedades necesarias para construir un Movimiento de Frasco. */
export interface BottleMovementProps {
  id?: string;                  // UUID generado por la BD.
  bottleId: string;             // FK al tipo de frasco afectado.
  type: BottleMovementType;     // IN o OUT.
  quantity: number;             // Cantidad de unidades del movimiento.
  reason: BottleMovementReason; // Razon del movimiento.
  reference?: string;           // Referencia opcional.
  createdAt?: Date;
}

/**
 * Clase de dominio BottleMovement.
 * Valida que la cantidad sea positiva al construir.
 */
export class BottleMovement {
  public readonly id?: string;
  public bottleId: string;
  public type: BottleMovementType;
  public quantity: number;
  public reason: BottleMovementReason;
  public reference?: string;
  public readonly createdAt?: Date;

  /**
   * Construye el movimiento validando que quantity sea positiva.
   * @throws Error si quantity es menor o igual a 0.
   */
  constructor(props: BottleMovementProps) {
    if (props.quantity <= 0) {
      throw new Error("Movement quantity must be greater than 0");
    }

    this.id = props.id;
    this.bottleId = props.bottleId;
    this.type = props.type;
    this.quantity = props.quantity;
    this.reason = props.reason;
    this.reference = props.reference;
    this.createdAt = props.createdAt;
  }
}
