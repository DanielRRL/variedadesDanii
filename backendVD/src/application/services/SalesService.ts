/**
 * Servicio de Ventas Presenciales (POS).
 * Maneja el flujo completo de una venta en mostrador:
 * validacion de stock, creacion de orden, descuento de inventario,
 * acreditacion de gramos/fichas y generacion de factura simple.
 *
 * A diferencia del flujo e-commerce (CreateOrderUseCase), aqui el admin
 * registra la venta directamente y la orden nace con status DELIVERED.
 *
 * Usa Prisma.$transaction para garantizar atomicidad.
 */

import prisma from "../../config/database";
import { IOrderRepository } from "../../domain/repositories/IOrderRepository";
import { IProductRepository } from "../../domain/repositories/IProductRepository";
import { InventoryService } from "./InventoryService";
import { GramService } from "./GramService";
import { GameTokenService } from "./GameTokenService";
import { SimpleInvoiceService, SimpleInvoiceData } from "./SimpleInvoiceService";
import { IEmailService } from "./IEmailService";
import { GramSourceType } from "../../domain/entities/GramAccount";
import { AppError } from "../../utils/AppError";
import logger from "../../utils/logger";

// ---------------------------------------------------------------------------
// Interfaces publicas
// ---------------------------------------------------------------------------

export interface POSSaleInput {
  products: Array<{ productId: string; quantity: number }>;
  paymentMethod: "CASH" | "NEQUI" | "DAVIPLATA" | "BANCOLOMBIA" | "TRANSFERENCIA";
  userId?: string;
  walkInClientName?: string;
  walkInClientEmail?: string;
  walkInClientPhone?: string;
  notes?: string;
  referralCode?: string;
  discount?: number;
}

export interface POSSaleResult {
  order: any;
  invoice: SimpleInvoiceData;
  gramsEarned: number;
  tokenIssued: boolean;
}

export class SalesService {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
    private readonly inventoryService: InventoryService,
    private readonly gramService: GramService,
    private readonly gameTokenService: GameTokenService,
    private readonly simpleInvoiceService: SimpleInvoiceService,
    private readonly emailService: IEmailService,
  ) {}

  /**
   * Crea una venta presencial (POS) de forma atomica.
   * Pasos:
   * 1. Validar stock de todos los productos
   * 2. Crear orden con items en transaccion Prisma
   * 3. Descontar inventario (essence o product movements)
   * 4. Marcar como DELIVERED
   * 5. Acreditar gramos y fichas si cliente registrado
   * 6. Generar factura simple
   */
  async createPOSSale(input: POSSaleInput): Promise<POSSaleResult> {
    // -- Paso 1: Validar productos y stock --
    const validatedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      product: any;
    }> = [];

    for (const item of input.products) {
      const product = await this.productRepo.findByIdWithRelations(item.productId);
      if (!product) {
        throw AppError.notFound(`Producto ${item.productId} no encontrado`);
      }
      if (!product.active) {
        throw AppError.badRequest(`Producto "${product.name}" no está disponible`);
      }

      // Validar stock según tipo
      if (product.essenceId) {
        const mlNeeded = (product.mlQuantity || 0) * item.quantity;
        const essenceStock = await this.inventoryService.getEssenceStock(product.essenceId);
        if (essenceStock < mlNeeded) {
          throw AppError.badRequest(
            `Stock insuficiente para "${product.name}". Disponible: ${essenceStock}ml, Necesario: ${mlNeeded}ml`
          );
        }
      } else {
        // Use product.stockUnits directly (source of truth for non-essence products)
        const productStock = product.stockUnits ?? 0;
        if (productStock < item.quantity) {
          throw AppError.badRequest(
            `Stock insuficiente para "${product.name}". Disponible: ${productStock}, Necesario: ${item.quantity}`
          );
        }
      }

      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal: product.price * item.quantity,
        product,
      });
    }

    // -- Paso 2: Calcular totales --
    const subtotal = validatedItems.reduce((sum, i) => sum + i.subtotal, 0);
    const discount = input.discount || 0;
    const total = Math.max(0, subtotal - discount);

    // -- Paso 3: Transaccion atomica --
    // Determinar userId: cliente registrado o admin POS
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminUser) {
      throw AppError.badRequest("No hay usuario admin configurado para ventas POS");
    }
    const orderUserId = input.userId || adminUser.id;

    // Generar numero de orden
    const seqResult = await prisma.$queryRaw<[{ val: bigint }]>`SELECT nextval('order_number_seq') as val`;
    const year = new Date().getFullYear();
    const seq = String(Number(seqResult[0].val)).padStart(4, "0");
    const orderNumber = `VD-${year}${seq}`;

    const order = await prisma.$transaction(async (tx) => {
      // 3a. Crear orden con items
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: orderUserId,
          type: "ONLINE" as any,
          status: "DELIVERED" as any,
          saleChannel: "IN_STORE" as any,
          paymentMethod: input.paymentMethod as any,
          walkInClient: input.walkInClientName || null,
          notes: input.notes,
          subtotal,
          discount,
          total,
          items: {
            create: validatedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: { include: { product: { include: { essence: true, bottle: true } } } },
          user: { select: { id: true, name: true, phone: true, email: true } },
        },
      });

      // 3b. Descontar inventario dentro de la transaccion
      for (const item of validatedItems) {
        if (item.product.essenceId) {
          // Esencia: salida de ml
          const mlOut = (item.product.mlQuantity || 0) * item.quantity;
          await tx.essenceMovement.create({
            data: {
              essenceId: item.product.essenceId,
              type: "OUT" as any,
              ml: mlOut,
              reason: "SALE" as any,
              reference: `order:${newOrder.id}`,
            },
          });

          // Frasco: salida de unidades (si aplica)
          if (item.product.bottleId) {
            await tx.bottleMovement.create({
              data: {
                bottleId: item.product.bottleId,
                type: "OUT" as any,
                quantity: item.quantity,
                reason: "SALE" as any,
                reference: `order:${newOrder.id}`,
              },
            });
          }
        } else {
          // Producto general: salida de unidades
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

    // -- Paso 4: Acreditar gramos y ficha de juego si cliente registrado --
    let gramsEarned = 0;
    let tokenIssued = false;

    if (input.userId) {
      try {
        // Contar productos que generan gramos
        for (const item of validatedItems) {
          if (item.product.generatesGram) {
            const result = await this.gramService.earnGrams(input.userId, {
              sourceType: GramSourceType.PRODUCT_PURCHASE,
              grams: item.quantity,
              description: `Compra presencial: ${item.product.name} x${item.quantity}`,
              referenceId: order.id,
            });
            gramsEarned += item.quantity;
          }
        }

        // Emitir ficha de juego
        const token = await this.gameTokenService.issueToken(input.userId, order.id);
        tokenIssued = token !== null;

        // Incrementar totalInStorePurchases
        await prisma.gramAccount.updateMany({
          where: { userId: input.userId },
          data: { totalInStorePurchases: { increment: 1 } },
        });
      } catch (err) {
        logger.warn("Error acreditando gramos/ficha en venta POS", { orderId: order.id, error: err });
      }
    }

    // -- Paso 5: Generar factura simple --
    const invoice = await this.simpleInvoiceService.generateAndSend(order.id);

    // Si es walk-in con email, enviar factura al email proporcionado
    if (!input.userId && input.walkInClientEmail) {
      try {
        await this.emailService.sendSimpleInvoice(input.walkInClientEmail, invoice);
      } catch (err) {
        logger.warn("Error enviando factura a walk-in client", { email: input.walkInClientEmail, error: err });
      }
    }

    logger.info("POS sale completed", {
      orderId: order.id,
      orderNumber,
      total,
      paymentMethod: input.paymentMethod,
      saleChannel: "IN_STORE",
      clientRegistered: !!input.userId,
    });

    return {
      order,
      invoice,
      gramsEarned,
      tokenIssued,
    };
  }
}
