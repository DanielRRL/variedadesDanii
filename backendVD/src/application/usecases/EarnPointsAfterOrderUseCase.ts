/**
 * Caso de uso: Acumular Puntos al Entregar una Orden.
 * Se dispara cuando el estado de una orden cambia a DELIVERED.
 * Orquesta el calculo de puntos base (proporcional al total de la orden),
 * el bono de primera compra si aplica, y la posterior verificacion
 * de subida de nivel en el programa de fidelizacion.
 */

// LoyaltyService - Para acreditar puntos y verificar nivel.
import {
  LoyaltyService,
  FIRST_PURCHASE_BONUS,
} from "../services/LoyaltyService";

// IOrderRepository - Para recuperar datos de la orden entregada.
import { IOrderRepository } from "../../domain/repositories/IOrderRepository";

// IUserRepository - Para consultar el total de ordenes entregadas del usuario.
import { IUserRepository } from "../../domain/repositories/IUserRepository";

// AppError - Errores HTTP personalizados.
import { AppError } from "../../utils/AppError";

// logger - Logger centralizado Winston.
import logger from "../../utils/logger";

export class EarnPointsAfterOrderUseCase {
  /**
   * Recibe dependencias via inyeccion.
   * @param loyaltyService - Servicio que gestiona puntos y niveles.
   * @param orderRepo      - Repositorio para obtener la orden entregada.
   * @param userRepo       - Repositorio para contar ordenes entregadas del usuario.
   */
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly orderRepo: IOrderRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  /**
   * Ejecuta la logica de acumulacion de puntos post-entrega.
   *
   * Pasos:
   * 1. Recupera la orden por orderId; lanza 404 si no existe.
   * 2. Calcula los puntos base proporcionales al total de la orden.
   * 3. Consulta cuantas ordenes DELIVERED tiene el usuario despues de esta.
   * 4. Si es la primera orden entregada (count === 1), agrega FIRST_PURCHASE_BONUS
   *    como llamada separada a earnPoints para tener transaccion propia.
   * 5. Llama a loyaltyService.earnPoints() que internamente actualiza el saldo
   *    y delega a checkAndUpgradeLevel segun el historial de ordenes.
   *
   * @param orderId - UUID de la orden que acaba de ser marcada como DELIVERED.
   * @param userId  - UUID del usuario dueno de la orden.
   * @throws AppError 404 si la orden no existe.
   */
  async execute(orderId: string, userId: string): Promise<void> {
    // Paso 1: Verificar que la orden existe
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw AppError.notFound(`Order ${orderId} not found.`);
    }

    // Paso 2: Calcular puntos base por el total de la orden
    const basePoints = this.loyaltyService.calculatePointsForOrder(order.total);

    // Paso 3: Consultar cantidad de ordenes entregadas del usuario
    const deliveredCount = await this.userRepo.countOrdersByUser(userId);

    logger.info("Earning points for delivered order", {
      orderId,
      userId,
      basePoints,
      deliveredCount,
    });

    // Paso 4: Acreditar puntos base por la orden
    if (basePoints > 0) {
      await this.loyaltyService.earnPoints(userId, {
        points:      basePoints,
        reason:      `Puntos por orden entregada`,
        referenceId: orderId,
      });
    }

    // Paso 5: Si es la primera orden entregada, acreditar bono de primera compra
    if (deliveredCount === 1) {
      await this.loyaltyService.earnPoints(userId, {
        points:      FIRST_PURCHASE_BONUS,
        reason:      "Bono de primera compra",
        referenceId: orderId,
      });
      logger.info("First purchase bonus awarded", { userId, bonus: FIRST_PURCHASE_BONUS });
    }
  }
}
