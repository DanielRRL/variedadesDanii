/**
 * Entidad de dominio: Canje de Esencia (EssenceRedemption).
 * Registro de cada canje de gramos por esencia. Se crea automaticamente
 * cuando currentGrams llega a 13 (1 oz completa) o manualmente para
 * canjes parciales.
 */

/** Estado de un canje de gramos por esencia. */
export enum EssenceRedemptionStatus {
  PENDING_DELIVERY = "PENDING_DELIVERY", // Gramos descontados, entrega pendiente.
  DELIVERED        = "DELIVERED",        // Admin marco la entrega como completada.
  CANCELLED        = "CANCELLED",        // Cancelado por admin (gramos revertidos).
}

/** Propiedades para construir un canje de esencia. */
export interface EssenceRedemptionProps {
  id?: string;
  userId: string;              // FK al usuario que realizo el canje.
  gramsUsed: number;           // Gramos descontados de la billetera.
  ozRedeemed: number;          // Onzas equivalentes (gramsUsed / 13.0).
  essenceName: string;         // Nombre de la esencia elegida.
  essenceId?: string | null;   // ID de la esencia del catalogo.
  status?: EssenceRedemptionStatus;
  adminNotes?: string | null;  // Notas del admin al entregar.
  deliveredById?: string | null; // Admin que proceso la entrega.
  deliveredAt?: Date | null;
  createdAt?: Date;
}

/** Entidad de dominio EssenceRedemption. */
export class EssenceRedemption {
  public readonly id?: string;
  public userId: string;
  public gramsUsed: number;
  public ozRedeemed: number;
  public essenceName: string;
  public essenceId?: string | null;
  public status: EssenceRedemptionStatus;
  public adminNotes?: string | null;
  public deliveredById?: string | null;
  public deliveredAt?: Date | null;
  public readonly createdAt?: Date;

  constructor(props: EssenceRedemptionProps) {
    this.id            = props.id;
    this.userId        = props.userId;
    this.gramsUsed     = props.gramsUsed;
    this.ozRedeemed    = props.ozRedeemed;
    this.essenceName   = props.essenceName;
    this.essenceId     = props.essenceId     ?? null;
    this.status        = props.status        ?? EssenceRedemptionStatus.PENDING_DELIVERY;
    this.adminNotes    = props.adminNotes    ?? null;
    this.deliveredById = props.deliveredById ?? null;
    this.deliveredAt   = props.deliveredAt   ?? null;
    this.createdAt     = props.createdAt;
  }
}
