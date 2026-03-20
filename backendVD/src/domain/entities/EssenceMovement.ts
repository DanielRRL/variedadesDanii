/**
 * Entidad de dominio: Movimiento de Esencia.
 * Registra cada entrada (IN) o salida (OUT) de mililitros de una esencia.
 * El stock actual se calcula como: SUM(IN) - SUM(OUT) de todos los movimientos.
 * Este patron basado en movimientos permite trazabilidad completa
 * del inventario sin perder historial.
 */

/** Tipo de movimiento: entrada o salida de inventario. */
export enum MovementType {
  IN = "IN",   // Entrada: compra de materia prima, devolucion, ajuste positivo.
  OUT = "OUT", // Salida: venta, uso en pedido, ajuste negativo.
}

/**
 * Razon del movimiento de esencia.
 * Permite categorizar cada movimiento para reportes.
 */
export enum MovementReason {
  PURCHASE = "PURCHASE",     // Compra de esencia a proveedor.
  SALE = "SALE",             // Uso de esencia para un pedido.
  REFILL = "REFILL",         // Recarga de un frasco devuelto.
  ADJUSTMENT = "ADJUSTMENT", // Ajuste manual de inventario.
  RETURN = "RETURN",         // Devolucion de esencia.
}

/** Propiedades necesarias para construir un Movimiento de Esencia. */
export interface EssenceMovementProps {
  id?: string;          // UUID generado por la BD.
  essenceId: string;    // FK a la esencia afectada.
  type: MovementType;   // IN o OUT.
  ml: number;           // Cantidad de mililitros del movimiento.
  reason: MovementReason; // Razon/causa del movimiento.
  reference?: string;   // Referencia opcional (ej: "order:uuid-123").
  createdAt?: Date;
}

/**
 * Clase de dominio EssenceMovement.
 * Valida que los mililitros sean positivos al construir.
 */
export class EssenceMovement {
  public readonly id?: string;
  public essenceId: string;
  public type: MovementType;
  public ml: number;
  public reason: MovementReason;
  public reference?: string;
  public readonly createdAt?: Date;

  /**
   * Construye el movimiento validando que ml sea positivo.
   * @throws Error si ml es menor o igual a 0.
   */
  constructor(props: EssenceMovementProps) {
    if (props.ml <= 0) {
      throw new Error("Movement ml must be greater than 0");
    }

    this.id = props.id;
    this.essenceId = props.essenceId;
    this.type = props.type;
    this.ml = props.ml;
    this.reason = props.reason;
    this.reference = props.reference;
    this.createdAt = props.createdAt;
  }
}
