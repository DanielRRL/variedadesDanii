/**
 * Caso de uso: Acumular gramos tras entrega de pedido.
 * Disparado cuando un pedido pasa a status DELIVERED.
 * Es fire-and-forget: nunca debe bloquear la entrega del pedido.
 *
 * Flujo:
 * 1. Recorrer cada item del pedido.
 * 2. Por cada producto con generatesGram=true: acumular GRAMS_PER_PURCHASE (1g).
 * 3. Incrementar totalPurchases en la billetera.
 * 4. Emitir una ficha de juego (GameToken) para el usuario.
 */

// Repositorios.
import { IOrderRepository } from "../../domain/repositories/IOrderRepository";
import { IProductRepository } from "../../domain/repositories/IProductRepository";
import { IGramRepository } from "../../domain/repositories/IGramRepository";

// Servicios.
import { GramService, GRAMS_PER_PURCHASE } from "../services/GramService";
import { GameTokenService } from "../services/GameTokenService";

// Entidades.
import { GramSourceType } from "../../domain/entities/GramAccount";

// Logger.
import logger from "../../utils/logger";

export class EarnGramAfterOrderUseCase {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
    private readonly gramRepo: IGramRepository,
    private readonly gramService: GramService,
    private readonly gameTokenService: GameTokenService,
  ) {}

  /**
   * Ejecuta la acumulacion de gramos tras la entrega del pedido.
   * Todo el flujo esta envuelto en try/catch para no bloquear
   * el cambio de estado del pedido (fire-and-forget).
   *
   * @param orderId - UUID del pedido entregado.
   * @param userId  - UUID del usuario que recibio el pedido.
   */
  async execute(orderId: string, userId: string): Promise<void> {
    try {
      // Paso 1: Obtener el pedido con sus items
      const order = await this.orderRepo.findById(orderId);
      if (!order || !order.items) {
        logger.warn("EarnGramAfterOrderUseCase: pedido no encontrado o sin items", { orderId });
        return;
      }

      // Paso 2: Contar productos que generan gramos
      let gramEligibleCount = 0;
      for (const item of order.items) {
        const product = await this.productRepo.findById(item.productId);
        if (product && (product as any).generatesGram === true) {
          gramEligibleCount += item.quantity;
        }
      }

      // Paso 3: Acumular gramos (1g por unidad de producto elegible)
      if (gramEligibleCount > 0) {
        const totalGrams = gramEligibleCount * GRAMS_PER_PURCHASE;
        await this.gramService.earnGrams(userId, {
          sourceType:  GramSourceType.PRODUCT_PURCHASE,
          grams:       totalGrams,
          description: `Compra entregada: ${gramEligibleCount} producto(s) elegible(s) del pedido`,
          referenceId: orderId,
        });
      }

      // Paso 4: Incrementar totalPurchases en la billetera
      const account = await this.gramService.getOrCreateAccount(userId);
      await this.gramRepo.incrementTotalPurchases(account.id!);

      // Paso 5: Emitir ficha de juego (retorna null si ya tiene 3 pendientes)
      await this.gameTokenService.issueToken(userId, orderId);

      logger.info("EarnGramAfterOrderUseCase completado", {
        orderId,
        userId,
        gramEligibleCount,
      });
    } catch (error) {
      // Fire-and-forget: loguear error pero no relanzar
      logger.error("Error en EarnGramAfterOrderUseCase (no bloquea entrega)", {
        orderId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
