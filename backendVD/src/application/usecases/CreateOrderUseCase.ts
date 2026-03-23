/**
 * Caso de uso: Crear Orden.
 * Orquesta todo el flujo de creacion de un pedido:
 * 1. Valida que los productos existan y esten activos.
 * 2. Verifica inventario segun categoria del producto:
 *    - PERFUME: esencia (ml) + frasco (unidades).
 *    - ACCESSORY / GENERAL: producto (unidades).
 * 3. Calcula subtotal y descuentos aplicables.
 * 4. Persiste la orden con items y descuentos.
 * 5. Registra movimientos de salida de inventario.
 * 6. Procesa el pago con la estrategia correcta (Nequi, Daviplata, etc.).
 */

// IOrderRepository - Para persistir la orden creada.
import { IOrderRepository } from "../../domain/repositories/IOrderRepository";

// IProductRepository - Para buscar productos con relaciones (esencia, frasco).
import { IProductRepository } from "../../domain/repositories/IProductRepository";

// IPaymentRepository - Para registrar el pago asociado a la orden.
import { IPaymentRepository } from "../../domain/repositories/IPaymentRepository";

// InventoryService - Para validar y registrar movimientos de stock.
import { InventoryService } from "../services/InventoryService";

// DiscountService - Para calcular descuentos (devolucion, frecuente, volumen).
import { DiscountService } from "../services/DiscountService";

// LoyaltyService - Para asegurar que el usuario tenga cuenta de fidelizacion.
import { LoyaltyService } from "../services/LoyaltyService";

// PaymentStrategyFactory - Factory para obtener la estrategia de pago correcta.
import { PaymentStrategyFactory } from "../services/PaymentStrategy";

// AppError - Errores HTTP personalizados.
import { AppError } from "../../utils/AppError";

// logger - Para registrar la creacion exitosa de ordenes.
import logger from "../../utils/logger";

/** Datos de entrada requeridos para crear una orden. */
export interface CreateOrderInput {
  userId: string;
  addressId?: string;
  type: string;
  paymentMethod: string;
  notes?: string;
  isBottleReturn: boolean;
  products: Array<{
    productId: string;
    quantity: number;
  }>;
}

/**
 * Datos internos de cada item validado.
 * Los campos de perfume son opcionales porque ACCESSORY/GENERAL no los usan.
 */
interface ValidatedItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  category: string;
  essenceId?: string;
  bottleId?: string;
  mlQuantity?: number;
}

export class CreateOrderUseCase {
  /**
   * Recibe todas las dependencias necesarias via inyeccion.
   * Este es el caso de uso mas complejo de la aplicacion.
   */
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
    private readonly paymentRepo: IPaymentRepository,
    private readonly inventoryService: InventoryService,
    private readonly discountService: DiscountService,
    private readonly loyaltyService: LoyaltyService
  ) {}

  /**
   * Ejecuta la creacion de la orden paso a paso.
   * Si cualquier paso falla, lanza AppError y no se crea la orden.
   */
  async execute(input: CreateOrderInput): Promise<any> {
    // -- Paso 1: Validar productos y recopilar datos --
    const orderItems: ValidatedItem[] = [];
    let totalMl = 0;

    for (const item of input.products) {
      // Buscar producto con esencia y frasco incluidos (null si no aplica)
      const product = await this.productRepo.findByIdWithRelations(
        item.productId
      );
      if (!product) {
        throw AppError.notFound(`Product ${item.productId} not found`);
      }
      if (!product.active) {
        throw AppError.badRequest(`Product "${product.name}" is not available`);
      }

      // -- Paso 2: Validar inventario segun categoria --
      if (product.category === "PERFUME") {
        await this.validatePerfumeStock(product, item.quantity);
        const mlNeeded = product.mlQuantity! * item.quantity;
        totalMl += mlNeeded;

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal: product.price * item.quantity,
          category: "PERFUME",
          essenceId: product.essenceId!,
          bottleId: product.bottleId!,
          mlQuantity: product.mlQuantity!,
        });
      } else {
        // ACCESSORY o GENERAL: validar stock de producto
        await this.validateProductStock(product, item.quantity);

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal: product.price * item.quantity,
          category: product.category,
        });
      }
    }

    // -- Paso 3: Calcular subtotal --
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    // -- Paso 4: Calcular descuentos aplicables --
    const discounts = await this.discountService.calculateAllDiscounts(
      input.userId,
      subtotal,
      totalMl,
      input.isBottleReturn
    );

    const totalDiscount = discounts.reduce((sum, d) => sum + d.amount, 0);
    // Total nunca puede ser negativo
    const total = Math.max(0, subtotal - totalDiscount);

    // -- Paso 5: Persistir la orden con items y descuentos --
    const order = await this.orderRepo.create({
      userId: input.userId,
      addressId: input.addressId,
      type: input.type,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      subtotal,
      discount: totalDiscount,
      total,
      items: orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      discounts: discounts.map((d) => ({
        type: d.type,
        percentage: d.percentage,
        amount: d.amount,
        description: d.description,
      })),
    });

    // -- Paso 6: Registrar movimientos de salida de inventario --
    await this.registerInventoryExits(orderItems, order.id);

    // -- Paso 7: Procesar pago con la estrategia correspondiente --
    const paymentStrategy = PaymentStrategyFactory.getStrategy(
      input.paymentMethod
    );
    const paymentResult = await paymentStrategy.pay(order.id, total);

    // Registrar pago en BD
    await this.paymentRepo.create({
      orderId: order.id,
      method: input.paymentMethod,
      status: paymentResult.success ? "PENDING" : "FAILED",
      amount: total,
      gatewayRef: paymentResult.gatewayRef,
      gatewayResponse: paymentResult.gatewayResponse,
    });

    logger.info(`Order created: ${order.id} - Total: $${total} - Method: ${input.paymentMethod}`);

    // -- Paso 5b: Asegurar cuenta de fidelizacion para el usuario --
    await this.loyaltyService.getOrCreateAccount(input.userId);

    return {
      order,
      discounts,
      payment: paymentResult,
    };
  }

  // ---------------------------------------------------------------------------
  // Metodos privados de validacion y registro de inventario
  // ---------------------------------------------------------------------------

  /**
   * Valida stock de esencia (ml) y frascos (unidades) para un producto PERFUME.
   * Lanza AppError si no hay stock suficiente.
   */
  private async validatePerfumeStock(
    product: any,
    quantity: number
  ): Promise<void> {
    const totalMlNeeded = product.mlQuantity * quantity;

    const essenceAvailable =
      await this.inventoryService.validateEssenceAvailability(
        product.essenceId,
        totalMlNeeded
      );
    if (!essenceAvailable) {
      const stock = await this.inventoryService.getEssenceStock(
        product.essenceId
      );
      throw AppError.badRequest(
        `Insufficient essence stock for "${product.name}". Available: ${stock}ml, Needed: ${totalMlNeeded}ml`
      );
    }

    const bottleAvailable =
      await this.inventoryService.validateBottleAvailability(
        product.bottleId,
        quantity
      );
    if (!bottleAvailable) {
      throw AppError.badRequest(
        `Insufficient bottle stock for "${product.name}"`
      );
    }
  }

  /**
   * Valida stock de unidades para un producto ACCESSORY o GENERAL.
   * Lanza AppError si no hay stock suficiente.
   */
  private async validateProductStock(
    product: any,
    quantity: number
  ): Promise<void> {
    const available =
      await this.inventoryService.validateProductAvailability(
        product.id,
        quantity
      );
    if (!available) {
      const stock = await this.inventoryService.getProductStock(product.id);
      throw AppError.badRequest(
        `Insufficient stock for "${product.name}". Available: ${stock}, Needed: ${quantity}`
      );
    }
  }

  /**
   * Registra todos los movimientos de salida de inventario para los items de la orden.
   * PERFUME: salida de esencia + frasco.
   * ACCESSORY/GENERAL: salida de producto.
   */
  private async registerInventoryExits(
    items: ValidatedItem[],
    orderId: string
  ): Promise<void> {
    for (const item of items) {
      if (item.category === "PERFUME") {
        const totalMlOut = item.mlQuantity! * item.quantity;

        // Salida de esencia (ml)
        await this.inventoryService.registerEssenceExit(
          item.essenceId!,
          totalMlOut,
          "SALE",
          `order:${orderId}`
        );

        // Salida de frascos (unidades)
        await this.inventoryService.registerBottleExit(
          item.bottleId!,
          item.quantity,
          "SALE",
          `order:${orderId}`
        );
      } else {
        // ACCESSORY o GENERAL: salida de producto (unidades)
        await this.inventoryService.registerProductExit(
          item.productId,
          item.quantity,
          "SALE",
          `order:${orderId}`
        );
      }
    }
  }
}
