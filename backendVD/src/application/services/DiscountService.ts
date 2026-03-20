/**
 * Servicio de descuentos.
 * Implementa las reglas de negocio de Variedades Danni:
 * - 10% por devolucion de frasco (reutilizacion).
 * - 5% por cliente frecuente (cada 5 compras entregadas).
 * - 8% por volumen (>= 90ml, aprox 3 onzas).
 * Los descuentos son acumulables entre si.
 */

// IUserRepository - Para contar ordenes entregadas del usuario (descuento frecuente).
import { IUserRepository } from "../../domain/repositories/IUserRepository";

// IBottleReturnRepository - Para verificar devoluciones del usuario.
import { IBottleReturnRepository } from "../../domain/repositories/IBottleReturnRepository";

/** Tipos de descuento soportados en el sistema. */
export enum DiscountType {
  BOTTLE_RETURN = "BOTTLE_RETURN",
  FREQUENT_CLIENT = "FREQUENT_CLIENT",
  VOLUME = "VOLUME",
}

/** Resultado de un calculo de descuento individual. */
export interface DiscountResult {
  type: DiscountType;
  percentage: number;
  amount: number;
  description: string;
}

// -- Constantes de reglas de negocio --

/** Porcentaje de descuento por devolver un frasco. */
const BOTTLE_RETURN_DISCOUNT_PERCENT = 10;

/** Cada cuantas compras entregadas se aplica descuento frecuente. */
const FREQUENT_CLIENT_THRESHOLD = 5;

/** Porcentaje de descuento por cliente frecuente. */
const FREQUENT_CLIENT_DISCOUNT_PERCENT = 5;

/** Mililitros minimos para descuento por volumen (~3 onzas). */
const VOLUME_ML_THRESHOLD = 90;

/** Porcentaje de descuento por volumen. */
const VOLUME_DISCOUNT_PERCENT = 8;

export class DiscountService {
  /**
   * Recibe repos de usuario y devoluciones via inyeccion de dependencias.
   * Se usan para consultar historial de compras y devoluciones.
   */
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly bottleReturnRepo: IBottleReturnRepository
  ) {}

  /** Calcula el descuento del 10% por devolucion de frasco. */
  async calculateBottleReturnDiscount(
    subtotal: number
  ): Promise<DiscountResult> {
    const percentage = BOTTLE_RETURN_DISCOUNT_PERCENT;
    const amount = Math.round(subtotal * (percentage / 100));

    return {
      type: DiscountType.BOTTLE_RETURN,
      percentage,
      amount,
      description: `Descuento por devolucion de frasco: ${percentage}%`,
    };
  }

  /**
   * Calcula descuento del 5% por cliente frecuente.
   * Se aplica cuando el usuario tiene un multiplo exacto de 5 compras entregadas.
   * Retorna null si no cumple la condicion.
   */
  async calculateFrequentClientDiscount(
    userId: string,
    subtotal: number
  ): Promise<DiscountResult | null> {
    const deliveredOrders = await this.userRepo.countOrdersByUser(userId);

    // Aplicar si las ordenes entregadas son multiplo de 5
    if (deliveredOrders > 0 && deliveredOrders % FREQUENT_CLIENT_THRESHOLD === 0) {
      const percentage = FREQUENT_CLIENT_DISCOUNT_PERCENT;
      const amount = Math.round(subtotal * (percentage / 100));

      return {
        type: DiscountType.FREQUENT_CLIENT,
        percentage,
        amount,
        description: `Descuento cliente frecuente (compra #${deliveredOrders + 1}): ${percentage}%`,
      };
    }

    return null;
  }

  /**
   * Calcula descuento del 8% si el total de ml >= 90.
   * Retorna null si el volumen no alcanza el umbral.
   */
  async calculateVolumeDiscount(
    totalMl: number,
    subtotal: number
  ): Promise<DiscountResult | null> {
    if (totalMl >= VOLUME_ML_THRESHOLD) {
      const percentage = VOLUME_DISCOUNT_PERCENT;
      const amount = Math.round(subtotal * (percentage / 100));

      return {
        type: DiscountType.VOLUME,
        percentage,
        amount,
        description: `Descuento por volumen (${totalMl}ml): ${percentage}%`,
      };
    }

    return null;
  }

  /**
   * Evalua todos los descuentos aplicables a una orden.
   * Los descuentos son acumulables: un cliente puede recibir los tres
   * si devuelve frasco, es frecuente, y supera el umbral de volumen.
   */
  async calculateAllDiscounts(
    userId: string,
    subtotal: number,
    totalMl: number,
    isBottleReturn: boolean
  ): Promise<DiscountResult[]> {
    const discounts: DiscountResult[] = [];

    // Descuento por devolucion de frasco (si aplica)
    if (isBottleReturn) {
      const bottleDiscount =
        await this.calculateBottleReturnDiscount(subtotal);
      discounts.push(bottleDiscount);
    }

    // Descuento por cliente frecuente (si aplica)
    const frequentDiscount = await this.calculateFrequentClientDiscount(
      userId,
      subtotal
    );
    if (frequentDiscount) {
      discounts.push(frequentDiscount);
    }

    // Descuento por volumen (si aplica)
    const volumeDiscount = await this.calculateVolumeDiscount(
      totalMl,
      subtotal
    );
    if (volumeDiscount) {
      discounts.push(volumeDiscount);
    }

    return discounts;
  }
}
