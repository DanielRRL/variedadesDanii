/**
 * Caso de uso: Crear Orden.
 * Orquesta todo el flujo de creacion de un pedido:
 * 1. Valida que los productos existan y esten activos.
 * 2. Verifica inventario segun categoria del producto:
 *    - PERFUME: esencia (ml) + frasco (unidades).
 *    - ACCESSORY / GENERAL: producto (unidades).
 *    El stock insuficiente NO bloquea la creacion — solo genera advertencias
 *    porque el pago es externo (Nequi/Bancolombia) y se verifica manualmente.
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

// LoyaltyService - Para asegurar que el usuario tenga cuenta de fidelizacion.
import { LoyaltyService } from "../services/LoyaltyService";

// PaymentStrategyFactory - Factory para obtener la estrategia de pago correcta.
import { PaymentStrategyFactory } from "../services/PaymentStrategy";

// AppError - Errores HTTP personalizados.
import { AppError } from "../../utils/AppError";

// logger - Para registrar la creacion exitosa de ordenes.
import logger from "../../utils/logger";

// prisma - Cliente de BD para transacciones atomicas.
import prisma from "../../config/database";

// getEssencePrice - Precio por onza para esencias del catalogo.
import { getEssencePrice, getEssenceMlFromProductMl } from "../../config/pricing";

// generateOrderNumber - Generación secuencial de numeros de orden.
import { generateOrderNumber } from "../../utils/orderNumber";

/** Datos de entrada requeridos para crear una orden. */
export interface CreateOrderInput {
  userId: string;
  addressId?: string;
  type: string;
  paymentMethod: string;
  notes?: string;
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
    private readonly loyaltyService: LoyaltyService
  ) {}

  /**
   * Ejecuta la creacion de la orden paso a paso.
   * El stock insuficiente no bloquea — solo genera advertencias en logs.
   */
  async execute(input: CreateOrderInput): Promise<any> {
    // -- Paso 1: Validar productos y recopilar datos --
    const orderItems: ValidatedItem[] = [];

    for (const item of input.products) {
      // Buscar producto con esencia y frasco incluidos (null si no aplica)
      let product = await this.productRepo.findByIdWithRelations(
        item.productId
      );
      if (!product) {
        // Fallback: ¿es un ID de esencia del catalogo?
        // El frontend envia el UUID de la esencia como productId cuando
        // el cliente agrega desde EssenceDetailPage. Buscamos la esencia
        // y creamos un product placeholder para procesar la orden.
        product = await this.getOrCreateEssenceCatalogProduct(item.productId, item.quantity);
      }
      if (!product.active) {
        throw AppError.badRequest(`Product "${product.name}" is not available`);
      }

      // -- Paso 2: Verificar inventario sin bloquear la orden --
      // El pago es externo (Nequi/Bancolombia) y se verifica manualmente.
      // Stock insuficiente solo genera advertencias, no rechaza el pedido.
      if (product.category === "PERFUME") {
        await this.checkPerfumeStock(product, item.quantity);

        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal: product.price * item.quantity,
          category: "PERFUME",
          essenceId: product.essenceId!,
          bottleId: product.bottleId!,
          mlQuantity: product.mlQuantity!,
        });
      } else {
        // ACCESSORY o GENERAL: verificar stock sin bloquear
        await this.checkProductStock(product, item.quantity);

        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
          subtotal: product.price * item.quantity,
          category: product.category,
        });
      }
    }

    // -- Paso 3: Calcular subtotal --
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal;

    // -- Paso 5: Persistir la orden con items Y descontar inventario en una transaccion atomica --
    const orderNumber = await generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      // 5a. Crear la orden con items y descuentos
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: input.userId,
          addressId: input.addressId,
          type: input.type as any,
          paymentMethod: input.paymentMethod as any,
          notes: input.notes,
          subtotal,
          discount: 0,
          total,
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          payment: true,
        },
      });

      // 5b. Registrar movimientos de salida de inventario dentro de la transaccion
      for (const item of orderItems) {
        if (item.category === "PERFUME") {
          const totalMlOut = getEssenceMlFromProductMl(item.mlQuantity!) * item.quantity;

          // Salida de esencia (ml)
          await tx.essenceMovement.create({
            data: {
              essenceId: item.essenceId!,
              type: "OUT" as any,
              ml: totalMlOut,
              reason: "SALE" as any,
              reference: `order:${newOrder.id}`,
            },
          });

          // Salida de frascos (unidades)
          if (item.bottleId) {
            await tx.bottleMovement.create({
              data: {
                bottleId: item.bottleId,
                type: "OUT" as any,
                quantity: item.quantity,
                reason: "SALE" as any,
                reference: `order:${newOrder.id}`,
              },
            });
          }
        } else {
          // ACCESSORY o GENERAL: decrementar stockUnits + crear movement
          await tx.product.update({
            where: { id: item.productId },
            data: { stockUnits: { decrement: item.quantity } },
          });
          await tx.productMovement.create({
            data: {
              productId: item.productId,
              type: "OUT" as any,
              quantity: item.quantity,
              reason: "SALE" as any,
              reference: `order:${newOrder.id}`,
            },
          });
        }
      }

      return newOrder;
    });

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
      payment: paymentResult,
    };
  }

  // ---------------------------------------------------------------------------
  // Metodos privados de validacion y registro de inventario
  // ---------------------------------------------------------------------------

  /**
   * Verifica stock de esencia (ml) y frascos (unidades) para un PERFUME.
   * NO bloquea la creacion de la orden — solo advierte en logs.
   */
  private async checkPerfumeStock(
    product: any,
    quantity: number
  ): Promise<void> {
    const totalMlNeeded = getEssenceMlFromProductMl(product.mlQuantity) * quantity;

    const essenceAvailable =
      await this.inventoryService.validateEssenceAvailability(
        product.essenceId,
        totalMlNeeded
      );
    if (!essenceAvailable) {
      const stock = await this.inventoryService.getEssenceStock(
        product.essenceId
      );
      logger.warn(
        `[CreateOrderUseCase] Stock bajo de esencia para "${product.name}". Disponible: ${stock}ml, Necesario: ${totalMlNeeded}ml`
      );
    }

    const bottleAvailable =
      await this.inventoryService.validateBottleAvailability(
        product.bottleId,
        quantity
      );
    if (!bottleAvailable) {
      logger.warn(
        `[CreateOrderUseCase] Stock bajo de frascos para "${product.name}"`
      );
    }
  }

  /**
   * Verifica stock de unidades para un ACCESSORY o GENERAL.
   * NO bloquea la creacion de la orden — solo advierte en logs.
   */
  private async checkProductStock(
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
      logger.warn(
        `[CreateOrderUseCase] Stock bajo para "${product.name}". Disponible: ${stock}, Necesario: ${quantity}`
      );
    }
  }

  /**
   * Busca o crea un product placeholder para una esencia del catalogo.
   *
   * Cuando el frontend agrega una esencia al carrito desde EssenceDetailPage,
   * envia el UUID de la esencia como productId. Como las esencias no tienen
   * un registro Product asociado automaticamente, este metodo:
   * 1. Busca la esencia por ID. Si no existe, lanza error.
   * 2. Busca un Product existente con ese essenceId y tipo ESSENCE_CATALOG.
   * 3. Si no existe, lo crea con precio global (getEssencePrice).
   */
  private async getOrCreateEssenceCatalogProduct(
    potentialEssenceId: string,
    oz: number,
  ): Promise<any> {
    // Buscar si existe la esencia
    const essence = await prisma.essence.findUnique({
      where: { id: potentialEssenceId },
    });
    if (!essence) {
      throw AppError.notFound(`Product ${potentialEssenceId} not found`);
    }

    // Buscar product placeholder existente para esta esencia
    const existing = await prisma.product.findFirst({
      where: { essenceId: potentialEssenceId, productType: "ESSENCE_CATALOG" as any },
    });
    if (existing) return existing;

    // Crear placeholder con precio global y nombre de la esencia
    const product = await prisma.product.create({
      data: {
        name: essence.name,
        essenceId: potentialEssenceId,
        category: "GENERAL" as any,
        productType: "ESSENCE_CATALOG" as any,
        price: getEssencePrice(oz),
        stockUnits: 999,
        generatesGram: false,
        active: true,
      },
    });

    logger.info("[CreateOrderUseCase] Created placeholder product for essence", {
      essenceId: potentialEssenceId,
      productId: product.id,
    });

    return product;
  }
}
