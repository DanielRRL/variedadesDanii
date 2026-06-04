/**
 * Servicio de Factura Simple (no DIAN).
 * Genera un comprobante de venta en formato JSON, lo persiste en Order.simpleInvoice
 * y envía un correo HTML al cliente si tiene email registrado.
 *
 * El numero de factura es secuencial por año: FAC-YYYY-NNNN.
 * Zona horaria: America/Bogota (UTC-5).
 *
 * Numeracion atomica: usa pg_advisory_xact_lock dentro de transaccion Prisma
 * para garantizar que dos requests concurrentes nunca generen el mismo numero.
 */

import { IOrderRepository } from "../../domain/repositories/IOrderRepository";
import { IEmailService } from "./IEmailService";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import logger from "../../utils/logger";
import prisma from "../../config/database";

// ---------------------------------------------------------------------------
// Interfaz publica
// ---------------------------------------------------------------------------

export interface SimpleInvoiceData {
  invoiceNumber: string;
  businessName: string;
  businessNit: string;
  businessAddress: string;
  businessPhone: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  orderNumber: string;
  date: string;
  time: string;
  timezone: string;
  city: string;
  saleChannel: "ECOMMERCE" | "IN_STORE";
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  notes?: string;
}

// Advisory lock key predecible para serializar generacion de numeros de factura.
// Cualquier valor constante es valido; usamos un hash simple del namespace.
const INVOICE_LOCK_KEY = 0x5644; // "VD" en hex

// Mapa de metodos de pago a texto legible en español
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  BANCOLOMBIA: "Bancolombia",
  CASH: "Efectivo",
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia bancaria",
};

export class SimpleInvoiceService {
  constructor(
    private readonly emailService: IEmailService,
    private readonly orderRepo: IOrderRepository,
  ) {}

  /**
   * Genera una factura simple para una orden, la persiste y envia por email.
   * Idempotente: si la orden ya tiene invoiceNumber, retorna la existente.
   * @param orderId - UUID de la orden.
   * @returns Datos de la factura generada.
   */
  async generateAndSend(orderId: string): Promise<SimpleInvoiceData> {
    // 0. Idempotencia: verificar si ya se genero una factura para esta orden.
    const existingOrder = await this.orderRepo.findById(orderId);
    if (!existingOrder) {
      throw AppError.notFound("Order not found");
    }

    if (existingOrder.simpleInvoice && existingOrder.invoiceNumber) {
      logger.info("SimpleInvoiceService: factura ya existe, retornando existente", {
        orderId,
        invoiceNumber: existingOrder.invoiceNumber,
      });
      return existingOrder.simpleInvoice as SimpleInvoiceData;
    }

    // 1. Generar número de factura y persistir en una transacción atómica.
    const now = new Date();
    const invoiceNumber = await this.getNextInvoiceNumberAndReserve(orderId);

    // 2. Formatear fecha/hora en zona Colombia
    const { date, time, timezone } = this.formatDate(now);

    // 3. Construir el objeto de factura
    const clientName = existingOrder.walkInClient || existingOrder.user?.name || "Cliente";
    const clientEmail = existingOrder.user?.email;
    const clientPhone = existingOrder.user?.phone;

    const invoice: SimpleInvoiceData = {
      invoiceNumber,
      businessName: env.business.name || "Variedades DANII",
      businessNit: env.business.nit || "Por configurar",
      businessAddress: env.business.address || "Armenia, Quindío, Colombia",
      businessPhone: env.business.phone || "300 383 7442",
      clientName,
      clientEmail: clientEmail || undefined,
      clientPhone: clientPhone || undefined,
      orderNumber: existingOrder.orderNumber || existingOrder.id.slice(0, 8).toUpperCase(),
      date,
      time,
      timezone,
      city: "Armenia, Quindío",
      saleChannel: existingOrder.saleChannel || "ECOMMERCE",
      items: existingOrder.items.map((item: any) => ({
        productName: item.product?.name || `Producto ${item.productId.slice(0, 6)}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      subtotal: existingOrder.subtotal,
      discount: existingOrder.discount,
      total: existingOrder.total,
      paymentMethod: PAYMENT_METHOD_LABELS[existingOrder.paymentMethod] || existingOrder.paymentMethod,
      notes: existingOrder.notes || undefined,
    };

    // 4. Guardar factura en la orden
    await this.orderRepo.update(orderId, {
      simpleInvoice: invoice as any,
      invoiceNumber,
    });

    // 5. Enviar email si hay destinatario
    const emailTo = clientEmail;
    if (emailTo) {
      try {
        await this.emailService.sendSimpleInvoice(emailTo, invoice);
      } catch (err) {
        logger.warn("Failed to send simple invoice email", { orderId, error: err });
      }
    } else {
      logger.info("Simple invoice generated without email (no email on record)", {
        orderId,
        invoiceNumber,
      });
    }

    return invoice;
  }

  /**
   * Reserva atomicamente el siguiente numero de factura y lo asigna a la orden.
   * El advisory lock, la lectura del ultimo numero y la escritura en la orden
   * ocurren dentro de una misma transaccion Prisma. El lock se libera al hacer
   * COMMIT, garantizando que ningun otro request concurrente pueda leer el
   * mismo numero antes de que este request termine de escribirlo.
   */
  private async getNextInvoiceNumberAndReserve(orderId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `FAC-${year}-`;

    return prisma.$transaction(async (tx) => {
      // Adquirir lock de advisory dentro de la transaccion
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock($1)`, INVOICE_LOCK_KEY);

      // Leer el ultimo numero del año actual
      const latest = await tx.order.findFirst({
        where: { invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: "desc" },
        select: { invoiceNumber: true },
      });

      let nextNum = 1;
      if (latest?.invoiceNumber) {
        const numPart = latest.invoiceNumber.replace(prefix, "");
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed)) {
          nextNum = parsed + 1;
        }
      }

      const invoiceNumber = `FAC-${year}-${String(nextNum).padStart(4, "0")}`;

      // Reservar el numero en la orden dentro de la misma transaccion
      await tx.order.update({
        where: { id: orderId },
        data: { invoiceNumber } as any,
      });

      return invoiceNumber;
    });
  }

  private formatDate(date: Date): { date: string; time: string; timezone: string } {
    const bogota = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);

    const timeFmt = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);

    return {
      date: bogota,
      time: timeFmt,
      timezone: "America/Bogota (UTC-5)",
    };
  }
}
