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
import { GameTokenService } from "./GameTokenService";
import { SimpleInvoiceService, SimpleInvoiceData } from "./SimpleInvoiceService";
import { IEmailService } from "./IEmailService";
import { AppError } from "../../utils/AppError";
import logger from "../../utils/logger";
import { getEssencePriceWithGrams, OZ_TO_ML, getEssenceMlForOz } from "../../config/pricing";
import { generateOrderNumber } from "../../utils/orderNumber";

// ---------------------------------------------------------------------------
// Interfaces publicas
// ---------------------------------------------------------------------------

export interface POSSaleInput {
  products: Array<{ productId: string; quantity: number; ozOverride?: number; essenceId?: string; mlQuantity?: number }>;
  paymentMethod: "CASH" | "NEQUI" | "DAVIPLATA" | "BANCOLOMBIA" | "TRANSFERENCIA";
  userId?: string;
  walkInClientName?: string;
  walkInClientEmail?: string;
  walkInClientPhone?: string;
  notes?: string;
  referralCode?: string;
  discount?: number;
  isRefill?: boolean;
  extraGrams?: number;
}

export interface POSSaleResult {
  order: any;
  invoice: SimpleInvoiceData;
  tokenIssued: boolean;
}

/** ID cached del producto placeholder para ventas de esencias en POS. */
let _essencePlaceholderId: string | null = null;

async function getOrCreateEssencePlaceholder(): Promise<string> {
  if (_essencePlaceholderId) return _essencePlaceholderId;

  const existing = await prisma.product.findFirst({
    where: { name: "Catálogo de Esencias", productType: "ESSENCE_CATALOG" as any },
  });

  if (existing) {
    _essencePlaceholderId = existing.id;
    return existing.id;
  }

  const created = await prisma.product.create({
    data: {
      name: "Catálogo de Esencias",
      category: "GENERAL" as any,
      productType: "ESSENCE_CATALOG" as any,
      price: 0,
      stockUnits: 0,
      generatesGram: false,
      active: true,
    },
  });

  _essencePlaceholderId = created.id;
  logger.info("Created essence placeholder product for POS", { id: created.id });
  return created.id;
}

export class SalesService {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
    private readonly inventoryService: InventoryService,
    private readonly gameTokenService: GameTokenService,
    private readonly simpleInvoiceService: SimpleInvoiceService,
    private readonly emailService: IEmailService,
  ) {}

  async createPOSSale(input: POSSaleInput): Promise<POSSaleResult> {
    const essencePlaceholderId = await getOrCreateEssencePlaceholder();

    // -- Paso 1: Validar productos y stock --
    const validatedItems: Array<{
      productId: string;
      dbProductId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      product: any;
      inputEssenceId?: string;
      inputMlQuantity?: number;
      inputOzOverride?: number;
    }> = [];

    for (const item of input.products) {
      let product = await this.productRepo.findByIdWithRelations(item.productId);

      if (!product && item.essenceId) {
        const essence = await prisma.essence.findUnique({ where: { id: item.essenceId } });
        if (!essence) {
          throw AppError.notFound(`Esencia ${item.essenceId} no encontrada`);
        }
        if (!essence.active) {
          throw AppError.badRequest(`Esencia "${essence.name}" no está disponible`);
        }
        product = {
          id: essencePlaceholderId,
          name: essence.name,
          active: true,
          essenceId: item.essenceId,
          mlQuantity: null,
          price: 0,
          stockUnits: 0,
      generatesGram: false,
          bottleId: null,
        };
      }

      if (!product) {
        throw AppError.notFound(`Producto ${item.productId} no encontrado`);
      }
      if (!product.active && product.name) {
        throw AppError.badRequest(`"${product.name}" no está disponible`);
      }

      const effectiveEssenceId = product.essenceId || item.essenceId;
      if (effectiveEssenceId) {
        const effectiveMl = item.mlQuantity
          ?? (item.ozOverride ? item.ozOverride * OZ_TO_ML : (product.mlQuantity || 0));
        const oz = item.ozOverride ?? Math.round(effectiveMl / OZ_TO_ML);
        const essenceMlPerUnit = getEssenceMlForOz(oz);
        const mlNeeded = essenceMlPerUnit * item.quantity;
        const essenceStock = await this.inventoryService.getEssenceStock(effectiveEssenceId);
        if (essenceStock < mlNeeded) {
          throw AppError.badRequest(
            `Stock insuficiente para "${product.name}". Disponible: ${essenceStock.toFixed(0)}ml, Necesario: ${mlNeeded}ml`
          );
        }
      } else {
        const productStock = product.stockUnits ?? 0;
        if (productStock < item.quantity) {
          throw AppError.badRequest(
            `Stock insuficiente para "${product.name}". Disponible: ${productStock}, Necesario: ${item.quantity}`
          );
        }
      }

      let unitPrice = product.price;
      const isEssence = effectiveEssenceId && (product.mlQuantity || item.mlQuantity);
      if (isEssence) {
        const effectiveMl = item.mlQuantity ?? (product.mlQuantity || 0);
        const oz = item.ozOverride || Math.round(effectiveMl / OZ_TO_ML);
        unitPrice = getEssencePriceWithGrams(oz, 0, input.isRefill || false).basePrice;
      }

      validatedItems.push({
        productId: item.productId,
        dbProductId: product.id,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
        product,
        inputEssenceId: item.essenceId,
        inputMlQuantity: item.mlQuantity,
        inputOzOverride: item.ozOverride,
      });
    }

    // -- Paso 2: Calcular totales --
    const extraGrams = input.extraGrams || 0;
    const extraGramsCost = extraGrams * 1_000;
    const subtotal = validatedItems.reduce((sum, i) => sum + i.subtotal, 0) + extraGramsCost;
    const discount = input.discount || 0;
    const total = Math.max(0, subtotal - discount);

    // -- Paso 3: Transaccion atomica --
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminUser) {
      throw AppError.badRequest("No hay usuario admin configurado para ventas POS");
    }
    const orderUserId = input.userId || adminUser.id;

    const orderNumber = await generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: orderUserId,
          type: (input.isRefill ? "REFILL" : "ONLINE") as any,
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
              productId: item.dbProductId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, name: true, phone: true, email: true } },
        },
      });

      for (const item of validatedItems) {
        const deductibleEssenceId = item.product.essenceId || item.inputEssenceId;
        if (deductibleEssenceId) {
          const effectiveMl = item.inputMlQuantity ?? (item.product.mlQuantity || 0);
          const oz = item.inputOzOverride ?? Math.round(effectiveMl / OZ_TO_ML);
          const essenceMlPerUnit = getEssenceMlForOz(oz);
          const mlOut = essenceMlPerUnit * item.quantity;
          await tx.essenceMovement.create({
            data: {
              essenceId: deductibleEssenceId,
              type: "OUT" as any,
              ml: mlOut,
              reason: "SALE" as any,
              reference: `order:${newOrder.id}`,
            },
          });

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
          await tx.product.update({
            where: { id: item.dbProductId },
            data: { stockUnits: { decrement: item.quantity } },
          });
          await tx.productMovement.create({
            data: {
              productId: item.dbProductId,
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

    // -- Paso 4: Emitir ficha de juego si cliente registrado --
    let tokenIssued = false;

    if (input.userId) {
      try {
        const token = await this.gameTokenService.issueToken(input.userId, order.id);
        tokenIssued = token !== null;
      } catch (err) {
        logger.warn("Error emitiendo ficha en venta POS", { orderId: order.id, error: err });
      }
    }

    // -- Paso 5: Generar factura simple --
    const invoice = await this.simpleInvoiceService.generateAndSend(order.id);

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
      tokenIssued,
    };
  }
}
