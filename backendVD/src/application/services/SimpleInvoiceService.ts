/**
 * Servicio de Factura Simple (no DIAN).
 * Genera un comprobante de venta en formato JSON, lo persiste en Order.simpleInvoice
 * y envía un correo HTML al cliente si tiene email registrado.
 *
 * El numero de factura es secuencial por año: FAC-YYYY-NNNN.
 * Zona horaria: America/Bogota (UTC-5).
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
   * @param orderId - UUID de la orden.
   * @returns Datos de la factura generada.
   */
  async generateAndSend(orderId: string): Promise<SimpleInvoiceData> {
    // 1. Buscar la orden con items y usuario
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw AppError.notFound("Order not found");
    }

    // 2. Generar numero de factura secuencial
    const now = new Date();
    const year = now.getFullYear();
    const lastNumber = await this.getLastInvoiceNumber(year);
    const invoiceNumber = this.generateInvoiceNumber(year, lastNumber);

    // 3. Formatear fecha/hora en zona Colombia
    const { date, time, timezone } = this.formatDate(now);

    // 4. Construir el objeto de factura
    const clientName = order.walkInClient || order.user?.name || "Cliente";
    const clientEmail = order.user?.email;
    const clientPhone = order.user?.phone;

    const invoice: SimpleInvoiceData = {
      invoiceNumber,
      businessName: "Variedades DANII",
      businessNit: env.business.nit || "Por configurar",
      businessAddress: "Armenia, Quindío, Colombia",
      businessPhone: "300 383 7442",
      clientName,
      clientEmail: clientEmail || undefined,
      clientPhone: clientPhone || undefined,
      orderNumber: order.orderNumber || order.id.slice(0, 8).toUpperCase(),
      date,
      time,
      timezone,
      city: "Armenia, Quindío",
      saleChannel: order.saleChannel || "ECOMMERCE",
      items: order.items.map((item: any) => ({
        productName: item.product?.name || `Producto ${item.productId.slice(0, 6)}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      paymentMethod: PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod,
      notes: order.notes || undefined,
    };

    // 5. Guardar factura en la orden
    await this.orderRepo.update(orderId, {
      simpleInvoice: invoice as any,
      invoiceNumber,
    });

    // 6. Enviar email si hay destinatario
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
   * Obtiene el último número de factura del año dado.
   * Consulta la BD buscando ordenes con invoiceNumber que empiece con FAC-YYYY-.
   */
  private async getLastInvoiceNumber(year: number): Promise<number> {
    const prefix = `FAC-${year}-`;
    const lastOrder = await prisma.order.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: "desc" },
      select: { invoiceNumber: true },
    });

    if (!lastOrder?.invoiceNumber) return 0;

    const numPart = lastOrder.invoiceNumber.replace(prefix, "");
    const parsed = parseInt(numPart, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  private generateInvoiceNumber(year: number, lastNumber: number): string {
    const next = lastNumber + 1;
    return `FAC-${year}-${String(next).padStart(4, "0")}`;
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
