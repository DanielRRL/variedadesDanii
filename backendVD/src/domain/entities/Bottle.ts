/**
 * Entidad de dominio: Frasco (Bottle).
 * Representa un tipo de frasco disponible para envasar esencias.
 * Los frascos se combinan con esencias para formar productos.
 * El programa de devolucion de frascos permite descuentos al cliente
 * cuando retorna uno usado.
 */

/**
 * Tipos de frasco disponibles.
 * - STANDARD: frasco basico, material regular.
 * - LUXURY: frasco premium, mejor acabado y material.
 */
export enum BottleType {
  STANDARD = "STANDARD",
  LUXURY = "LUXURY",
}

/** Propiedades necesarias para construir un Frasco. */
export interface BottleProps {
  id?: string;        // UUID generado por la BD.
  name: string;       // Nombre descriptivo del frasco.
  type: BottleType;   // Tipo: STANDARD o LUXURY.
  material: string;   // Material del frasco (vidrio, ceramica, etc.).
  capacityMl: number; // Capacidad en mililitros.
  active: boolean;    // Si esta disponible para uso.
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Clase de dominio Bottle.
 * El stock se controla mediante movimientos (BottleMovement),
 * no como un campo directo en esta entidad.
 */
export class Bottle {
  public readonly id?: string;
  public name: string;
  public type: BottleType;
  public material: string;
  public capacityMl: number;
  public active: boolean;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  /** Construye la entidad a partir de las propiedades recibidas. */
  constructor(props: BottleProps) {
    this.id = props.id;
    this.name = props.name;
    this.type = props.type;
    this.material = props.material;
    this.capacityMl = props.capacityMl;
    this.active = props.active;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
