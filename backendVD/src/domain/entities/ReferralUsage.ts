/**
 * Entidad de dominio: Uso de Codigo de Referido (ReferralUsage).
 * Registra cada vez que un nuevo usuario utilizo el codigo de
 * referido de otro cliente. Cuando rewardGiven=true ya se
 * acreditaron puntos al dueno del codigo.
 */

/** Propiedades para construir un registro de uso de referido. */
export interface ReferralUsageProps {
  id?: string;
  referralCodeId: string; // FK al codigo de referido utilizado.
  newUserId: string;      // FK al nuevo usuario que ingreso con el codigo.
  rewardGiven?: boolean;  // Si ya se proceso la recompensa al referidor.
  createdAt?: Date;
}

/** Entidad de dominio ReferralUsage. */
export class ReferralUsage {
  public readonly id?: string;
  public referralCodeId: string;
  public newUserId: string;
  public rewardGiven: boolean;
  public readonly createdAt?: Date;

  constructor(props: ReferralUsageProps) {
    this.id             = props.id;
    this.referralCodeId = props.referralCodeId;
    this.newUserId      = props.newUserId;
    this.rewardGiven    = props.rewardGiven ?? false;
    this.createdAt      = props.createdAt;
  }
}
