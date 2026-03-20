/**
 * Entidad de dominio: Auditoria de Inventario.
 * Registra la conciliacion entre el inventario del sistema
 * y el conteo fisico real. Se usa para detectar diferencias
 * (mermas, errores de registro, robos) y mantener la trazabilidad.
 */

/** Tipos de entidad que pueden ser auditadas. */
export enum AuditEntityType {
  ESSENCE = "ESSENCE",
  BOTTLE = "BOTTLE",
  PRODUCT = "PRODUCT",
}

/** Propiedades para construir una auditoria de inventario. */
export interface InventoryAuditProps {
  id?: string;
  entityType: string;    // ESSENCE, BOTTLE o PRODUCT.
  entityId: string;      // UUID de la entidad auditada.
  systemValue: number;   // Valor que reporta el sistema.
  physicalValue: number; // Valor del conteo fisico.
  difference: number;    // physicalValue - systemValue.
  notes?: string | null; // Observaciones del operador.
  userId: string;        // Quien realizo la auditoria.
  createdAt?: Date;
}

/**
 * Clase de dominio InventoryAudit.
 * Valida que los valores sean coherentes (no negativos).
 */
export class InventoryAudit {
  public readonly id?: string;
  public entityType: string;
  public entityId: string;
  public systemValue: number;
  public physicalValue: number;
  public difference: number;
  public notes?: string | null;
  public userId: string;
  public readonly createdAt?: Date;

  constructor(props: InventoryAuditProps) {
    if (props.physicalValue < 0) {
      throw new Error("physicalValue cannot be negative");
    }

    this.id = props.id;
    this.entityType = props.entityType;
    this.entityId = props.entityId;
    this.systemValue = props.systemValue;
    this.physicalValue = props.physicalValue;
    this.difference = props.difference;
    this.notes = props.notes;
    this.userId = props.userId;
    this.createdAt = props.createdAt;
  }

  /** Indica si hubo diferencia entre el sistema y el conteo fisico. */
  hasDifference(): boolean {
    return this.difference !== 0;
  }
}
