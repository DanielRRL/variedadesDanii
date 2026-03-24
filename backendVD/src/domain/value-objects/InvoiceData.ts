/**
 * InvoiceData — Objeto de valor que encapsula el payload completo
 * necesario para generar una factura electronica segun Anexo Tecnico DIAN v1.9.
 *
 * Este objeto es construido por InvoiceService y pasado a IInvoiceGateway
 * para su transformacion a XML UBL 2.1, firma y envio a la DIAN.
 *
 * Codigos de tipo de factura (invoiceTypeCode):
 *   "01" = Factura de venta (la mas comun en Variedades Danni).
 *   "02" = Factura de exportacion.
 *
 * Codigos de medio de pago (paymentMeansCode):
 *   "1"  = Efectivo (CASH).
 *   "42" = Consignacion / Transferencia electronica (NEQUI, BREB, BANCOLOMBIA).
 */

import { InvoiceLineItem } from "./InvoiceLineItem";
import { InvoiceParty } from "./InvoiceParty";

export interface InvoiceData {
  /** Numero secuencial en formato SEQF-0001. */
  invoiceNumber: string;
  /** Fecha y hora de emision en ISO 8601 con offset Colombia: "2024-03-20T14:30:00-05:00". */
  issueDate: string;
  /** Fecha y hora de vencimiento (= issueDate para pagos de contado). */
  dueDate: string;
  /** "01" = factura de venta. "02" = exportacion. */
  invoiceTypeCode: "01" | "02";
  /** "1" = efectivo, "42" = transferencia/consignacion. */
  paymentMeansCode: "1" | "42";
  /** UUID del pedido que origina esta factura. */
  orderId: string;
  /** Numero legible del pedido (ej: "VD-20240001"). */
  orderNumber?: string;
  /** Datos del emisor (Variedades Danni). */
  issuer: InvoiceParty;
  /** Datos del receptor (cliente o consumidor anonimo). */
  buyer: InvoiceParty;
  /** Lineas de detalle de la factura (una por producto). */
  items: InvoiceLineItem[];
  /** Suma de item.subtotal (antes de descuentos e impuestos). */
  subtotal: number;
  /** Suma de item.discountAmount. */
  discountTotal: number;
  /** Suma de item.taxAmount. */
  taxTotal: number;
  /** Total a pagar: subtotal - discountTotal + taxTotal. */
  total: number;
  /** CUFE calculado (SHA-384). Se puede poblar antes del envio o tras la firma. */
  cufe?: string;
  /** Notas adicionales de la orden (opcionales). */
  notes?: string;
}
