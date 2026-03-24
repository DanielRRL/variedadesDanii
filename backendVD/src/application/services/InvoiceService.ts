/**
 * InvoiceService — Servicio de facturacion electronica.
 *
 * Orquesta el ciclo de vida completo de una factura:
 *   1. Carga la orden con sus relaciones (usuario, items, pago).
 *   2. Verifica idempotencia (evita duplicados si SENT o ACCEPTED).
 *   3. Obtiene el siguiente numero de factura de la secuencia atomica.
 *   4. Construye los objetos de valor (InvoiceParty, InvoiceLineItem, InvoiceData).
 *   5. Crea el registro DRAFT en BD.
 *   6. Envia a la DIAN via IInvoiceGateway (o al STUB durante desarrollo).
 *   7. Actualiza el registro con CUFE, XML y estado SENT.
 *   8. Envia email al cliente con el numero de factura.
 *
 * Patron de contingencia:
 *   Si el envio a la DIAN falla (excepcion o respuesta negativa), la factura
 *   permanece en estado DRAFT. El admin puede reintentar desde el panel con
 *   retryDraftInvoice(). Esto garantiza que un fallo temporal de la DIAN
 *   no pierda el numero de factura ni bloquee el flujo de pedidos.
 *
 * Idempotencia:
 *   Si ya existe una factura SENT o ACCEPTED para la orden, se devuelve
 *   sin crear un duplicado. Protege contra callbacks duplicados de Wompi.
 */

import { IInvoiceRepository } from "../../domain/repositories/IInvoiceRepository";
import { IOrderRepository } from "../../domain/repositories/IOrderRepository";
import { IInvoiceGateway } from "./IInvoiceGateway";
import { IEmailService } from "./IEmailService";
import { InvoiceLineItem } from "../../domain/value-objects/InvoiceLineItem";
import { InvoiceParty } from "../../domain/value-objects/InvoiceParty";
import { InvoiceData } from "../../domain/value-objects/InvoiceData";
import { ElectronicInvoice, InvoiceStatus } from "../../domain/entities/ElectronicInvoice";
import { AppError } from "../../utils/AppError";
import logger from "../../utils/logger";
import { env } from "../../config/env";

// Mapeado de metodos de pago a codigos DIAN segun Res. 000042 Anexo Tecnico.
// "1"  = Efectivo (instrumento de pago 1).
// "42" = Consignacion / Transferencia bancaria electronica.
const PAYMENT_MEANS_MAP: Record<string, "1" | "42"> = {
  CASH:        "1",
  NEQUI:       "42",
  BREB:        "42",
  BANCOLOMBIA: "42",
};

export class InvoiceService {
  constructor(
    private readonly invoiceRepo: IInvoiceRepository,
    private readonly orderRepo: IOrderRepository,
    private readonly dianClient: IInvoiceGateway,
    private readonly emailService: IEmailService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // METODO PRINCIPAL: generateForOrder
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Genera y envia una factura electronica para la orden indicada.
   * Si ya existe una factura valida (SENT/ACCEPTED), la retorna sin duplicar.
   *
   * @param orderId - UUID de la orden a facturar.
   * @returns La ElectronicInvoice creada o la existente si ya fue procesada.
   * @throws AppError.notFound si la orden no existe.
   */
  async generateForOrder(orderId: string): Promise<ElectronicInvoice> {

    // ── Paso 1: Cargar la orden completa (usuario, items, pago). ────────────
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw AppError.notFound(`Orden ${orderId} no encontrada para facturar`);
    }

    // ── Paso 2: Idempotencia — retornar factura existente si ya fue enviada. ─
    const existing = await this.invoiceRepo.findByOrderId(orderId);
    if (
      existing &&
      (existing.status === InvoiceStatus.SENT || existing.status === InvoiceStatus.ACCEPTED)
    ) {
      logger.info("InvoiceService: factura ya existe para la orden, retornando existente", {
        orderId,
        invoiceNumber: existing.invoiceNumber,
        status: existing.status,
      });
      return existing;
    }

    // ── Paso 3: Numero de factura de la secuencia atomica PostgreSQL. ────────
    const invoiceNumber = await this.invoiceRepo.getNextInvoiceNumber();

    // ── Paso 4: Construir partes (emisor y receptor). ────────────────────────
    const issuer = this.buildIssuerParty();
    const buyer  = this.buildBuyerParty(order.user);

    // ── Paso 5: Construir items de la factura desde los items de la orden. ───
    const items = this.buildLineItems(order.items ?? []);

    // ── Paso 6: Calcular totales. ────────────────────────────────────────────
    const subtotal     = items.reduce((s, i) => s + i.subtotal, 0);
    const discountTotal = items.reduce((s, i) => s + i.discountAmount, 0);
    const taxTotal     = items.reduce((s, i) => s + i.taxAmount, 0);

    // ── Paso 7: Determinar codigo de medio de pago. ──────────────────────────
    const paymentMeansCode: "1" | "42" =
      PAYMENT_MEANS_MAP[order.paymentMethod as string] ?? "1";

    // ── Paso 8: Construir InvoiceData completo. ──────────────────────────────
    const now = new Date();
    const invoiceData: InvoiceData = {
      invoiceNumber,
      issueDate:       now.toISOString(),
      dueDate:         now.toISOString(),   // Pago de contado: vencimiento = emision.
      invoiceTypeCode: "01",
      paymentMeansCode,
      orderId,
      orderNumber:     order.orderNumber,
      issuer,
      buyer,
      items,
      subtotal,
      discountTotal,
      taxTotal,
      total:           order.total,
      notes:           order.notes,
    };

    // ── Paso 9: Crear registro DRAFT en BD. ──────────────────────────────────
    let invoice = await this.invoiceRepo.create({ orderId, invoiceNumber });
    if (!invoice.id) {
      throw AppError.internal("Error al crear el registro de factura en BD");
    }

    // ── Paso 10: Intentar envio a la DIAN (o al STUB). ───────────────────────
    let dianResult;
    try {
      dianResult = await this.dianClient.sendInvoice(invoiceData);
    } catch (err: any) {
      logger.error("InvoiceService: error al enviar factura a la DIAN", {
        orderId,
        invoiceNumber,
        error: err?.message,
      });
      // La factura queda en DRAFT para reintento posterior desde el panel admin.
      return invoice;
    }

    if (!dianResult.success) {
      logger.warn("InvoiceService: DIAN rechazo la factura, permanece en DRAFT", {
        orderId,
        invoiceNumber,
        statusCode:  dianResult.statusCode,
        description: dianResult.statusDescription,
        errors:      dianResult.errors,
      });
    invoice = await this.invoiceRepo.update(invoice.id!, {
        dianResponse: JSON.stringify(dianResult),
      });
      return invoice;
    }

    // ── Paso 11: Actualizar con CUFE, XML y estado SENT. ─────────────────────
    invoice = await this.invoiceRepo.update(invoice.id!, {
      cufe:         dianResult.cufe,
      xmlContent:   dianResult.xmlSigned,
      status:       InvoiceStatus.SENT,
      dianResponse: JSON.stringify(dianResult),
      issuedAt:     now,
    });

    logger.info("InvoiceService: factura enviada exitosamente", {
      orderId,
      invoiceNumber,
      cufe:    dianResult.cufe,
      trackId: dianResult.trackId,
    });

    // ── Paso 12: Notificar al cliente por email. ──────────────────────────────
    try {
      if (order.user?.email) {
        await this.emailService.sendInvoiceEmail(order.user.email, {
          orderNumber:    order.orderNumber ?? orderId,
          invoicePdfUrl:  invoice.pdfUrl ?? "",
          clientName:     order.user.name ?? "Cliente",
        });
      }
    } catch (emailErr: any) {
      // El error de email no debe revertir la factura ya emitida.
      logger.error("InvoiceService: fallo al enviar email de factura", {
        orderId,
        invoiceNumber,
        error: emailErr?.message,
      });
    }

    return invoice;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // retryDraftInvoice
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Reintenta el envio de una factura que quedo en estado DRAFT.
   * Reutiliza el mismo numero de factura (no genera uno nuevo).
   * Solo puede ejecutarlo un administrador.
   *
   * @param orderId - UUID de la orden cuya factura se va a reintentar.
   * @param adminId - UUID del admin que solicita el reintento (auditoria).
   * @throws AppError.notFound si no existe factura para la orden.
   * @throws AppError(422) si la factura no esta en estado DRAFT.
   * @throws AppError.internal si el reintento de envio a la DIAN falla.
   */
  async retryDraftInvoice(orderId: string, adminId: string): Promise<ElectronicInvoice> {
    // Buscar la factura existente por orderId.
    const invoice = await this.invoiceRepo.findByOrderId(orderId);
    if (!invoice) {
      throw AppError.notFound(`No existe factura para la orden ${orderId}`);
    }
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new AppError(
        `Solo se pueden reintentar facturas en estado DRAFT. Estado actual: ${invoice.status}`,
        422
      );
    }

    logger.info("InvoiceService: reintentando factura DRAFT", {
      invoiceNumber: invoice.invoiceNumber,
      orderId,
      adminId,
    });

    // Cargar la orden para reconstruir el payload.
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw AppError.notFound(`Orden ${orderId} no encontrada al reintentar factura`);
    }

    const issuer = this.buildIssuerParty();
    const buyer  = this.buildBuyerParty(order.user);
    const items  = this.buildLineItems(order.items ?? []);

    const subtotal      = items.reduce((s, i) => s + i.subtotal, 0);
    const discountTotal = items.reduce((s, i) => s + i.discountAmount, 0);
    const taxTotal      = items.reduce((s, i) => s + i.taxAmount, 0);

    const paymentMeansCode: "1" | "42" =
      PAYMENT_MEANS_MAP[order.paymentMethod as string] ?? "1";

    const now = new Date();
    const invoiceData: InvoiceData = {
      invoiceNumber:   invoice.invoiceNumber,   // Mantener el numero del DRAFT.
      issueDate:       now.toISOString(),
      dueDate:         now.toISOString(),
      invoiceTypeCode: "01",
      paymentMeansCode,
      orderId,
      orderNumber:     order.orderNumber,
      issuer,
      buyer,
      items,
      subtotal,
      discountTotal,
      taxTotal,
      total:           order.total,
      notes:           order.notes,
    };

    // Reintentar envio a la DIAN.
    let dianResult;
    try {
      dianResult = await this.dianClient.sendInvoice(invoiceData);
    } catch (err: any) {
      logger.error("InvoiceService.retryDraftInvoice: error al enviar a la DIAN", {
        orderId,
        error: err?.message,
      });
      throw AppError.internal("Error al comunicarse con la DIAN. Intente de nuevo en unos minutos.");
    }

    if (!dianResult.success) {
      await this.invoiceRepo.update(invoice.id!, {
        dianResponse: JSON.stringify(dianResult),
      });
      throw new AppError(
        `DIAN rechazo la factura: [${dianResult.statusCode}] ${dianResult.statusDescription}`,
        422
      );
    }

    // Actualizar el mismo registro DRAFT con los datos del exito.
    const updated = await this.invoiceRepo.update(invoice.id!, {
      cufe:         dianResult.cufe,
      xmlContent:   dianResult.xmlSigned,
      status:       InvoiceStatus.SENT,
      dianResponse: JSON.stringify(dianResult),
      issuedAt:     now,
    });

    logger.info("InvoiceService: reintento exitoso", {
      orderId,
      invoiceNumber: invoice.invoiceNumber,
      adminId,
    });

    // Notificar al cliente.
    try {
      if (order.user?.email) {
        await this.emailService.sendInvoiceEmail(order.user.email, {
          orderNumber:   order.orderNumber ?? orderId,
          invoicePdfUrl: updated.pdfUrl ?? "",
          clientName:    order.user.name ?? "Cliente",
        });
      }
    } catch (emailErr: any) {
      logger.error("InvoiceService.retryDraftInvoice: fallo al enviar email", {
        orderId,
        error: emailErr?.message,
      });
    }

    return updated;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // getInvoiceSummary
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene el resumen de la factura asociada a una orden.
   * Devuelve null si la orden no tiene factura (no lanza 404).
   * @param orderId - UUID de la orden.
   */
  async getInvoiceSummary(orderId: string): Promise<ElectronicInvoice | null> {
    return this.invoiceRepo.findByOrderId(orderId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Metodos privados de construccion
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Construye la InvoiceParty del emisor (Variedades Danni) a partir
   * de las variables de entorno DIAN_*.
   * Usa valores por defecto razonables para el entorno de desarrollo.
   */
  private buildIssuerParty(): InvoiceParty {
    // env.dian se agrega en la Parte 8; usar cast seguro para no romper
    // el build mientras las vars no existan todavia en el .env de desarrollo.
    const d = (env as any).dian ?? {};

    return new InvoiceParty({
      documentType:        "NIT",
      documentNumber:      d.nit              ?? "000000000",
      checkDigit:          d.nitCheckDigit    ?? "0",
      companyName:         d.companyName      ?? "Variedades Danni",
      displayName:         d.companyName      ?? "Variedades Danni",
      email:               d.email            ?? "facturas@variedadesdanni.co",
      phone:               d.phone,
      address:             d.address          ?? "Calle Principal",
      cityCode:            d.cityCode         ?? "63001",
      cityName:            d.cityName         ?? "Armenia",
      departmentCode:      d.departmentCode   ?? "63",
      departmentName:      d.departmentName   ?? "Quindio",
      countryCode:         "CO",
      taxRegime:           d.taxRegime        ?? "48",
      taxResponsibilities: ["R-99-PN"],
    });
  }

  /**
   * Construye la InvoiceParty del receptor a partir del usuario de la orden.
   *
   * Si el usuario no tiene datos suficientes o el monto es bajo,
   * se usa el Consumidor Final Anonimo de la DIAN (documento 222222222).
   * Ver docs/DIAN_INTEGRATION.md seccion 1 para el umbral legal.
   */
  private buildBuyerParty(user: any): InvoiceParty {
    if (!user || !user.email) {
      return new InvoiceParty({
        documentType:        "CC",
        documentNumber:      "222222222",
        displayName:         "Consumidor Final",
        email:               "consumidor@final.co",
        address:             "No aplica",
        cityCode:            "63001",
        cityName:            "Armenia",
        departmentCode:      "63",
        departmentName:      "Quindio",
        countryCode:         "CO",
        taxRegime:           "48",
        taxResponsibilities: ["R-99-PN"],
      });
    }

    const nameParts = (user.name ?? "").split(" ");
    return new InvoiceParty({
      documentType:        "CC",
      documentNumber:      user.documentNumber ?? "222222222",
      displayName:         user.name           ?? "Cliente",
      firstName:           nameParts[0]        || undefined,
      lastName:            nameParts.slice(1).join(" ") || undefined,
      email:               user.email,
      phone:               user.phone,
      address:             user.address        ?? "No especificada",
      cityCode:            "63001",
      cityName:            "Armenia",
      departmentCode:      "63",
      departmentName:      "Quindio",
      countryCode:         "CO",
      taxRegime:           "48",
      taxResponsibilities: ["R-99-PN"],
    });
  }

  /**
   * Construye los InvoiceLineItem desde los items de la orden.
   *
   * Asigna:
   *   - UNSPSC 10000000 (perfumes y fragancias) por defecto.
   *   - Unidad "NAR" (unidad logistica) por defecto.
   *   - IVA 0% (no responsable de IVA, regimen simplificado).
   *   - Descuentos de linea en 0% (los descuentos de fidelizacion son a nivel de orden).
   */
  private buildLineItems(orderItems: any[]): InvoiceLineItem[] {
    return orderItems.map((item: any, index: number) =>
      InvoiceLineItem.create({
        lineNumber:      index + 1,
        productId:       item.productId,
        description:     item.product?.name ?? `Producto ${item.productId}`,
        unspscCode:      "10000000",
        quantity:        item.quantity,
        unitMeasureCode: "NAR",
        unitPrice:       item.unitPrice,
        discountPercent: 0,
        taxPercent:      0,
      })
    );
  }
}
