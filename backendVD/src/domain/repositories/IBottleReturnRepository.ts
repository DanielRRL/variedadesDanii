/**
 * Interface del repositorio de Devoluciones de Frascos.
 * Define operaciones para registrar y consultar devoluciones
 * del programa de reciclaje de Variedades Danni.
 */

/** Contrato del repositorio de devoluciones de frascos. */
export interface IBottleReturnRepository {
  /** Registra una nueva devolucion de frasco con su descuento asociado. */
  create(data: {
    userId: string;         // Cliente que devuelve.
    bottleId: string;       // Tipo de frasco devuelto.
    discountApplied: number;// Porcentaje de descuento (10%).
    notes?: string;         // Notas opcionales.
  }): Promise<any>;

  /** Obtiene todas las devoluciones de un usuario con datos del frasco. */
  findByUserId(userId: string): Promise<any[]>;

  /** Cuenta las devoluciones de un usuario. */
  countByUserId(userId: string): Promise<number>;
}
