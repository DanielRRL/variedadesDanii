/**
 * Entidad de dominio: Factura Electronica (ElectronicInvoice).
 * Representa el ciclo de vida de una factura electronica conforme
 * a la normativa DIAN (Colombia). Relacion 1:1 con Order.
 * El CUFE lo asigna la DIAN tras la aceptacion.
 */

/** Estados del ciclo de vida de una factura electronica. */
export enum InvoiceStatus {
  DRAFT    = "DRAFT",    // Borrador local, no enviado a la DIAN.
  SENT     = "SENT",     // Enviado, esperando respuesta.
  ACCEPTED = "ACCEPTED", // Aceptado y validado por la DIAN.
  REJECTED = "REJECTED", // Rechazado; requiere correccion.
}

/** Propiedades para construir una factura electronica. */
export interface ElectronicInvoiceProps {
  id?: string;
  orderId: string;          // FK al pedido facturado.
  invoiceNumber: string;    // Numero en formato SEQF-0001.
  cufe?: string | null;     // Codigo DIAN, asignado al ser aceptada.
  status?: InvoiceStatus;   // Estado ante la DIAN.
  xmlContent?: string | null; // XML UBL 2.1 enviado a la DIAN.
  pdfUrl?: string | null;   // URL publica del PDF para el cliente.
  dianResponse?: unknown;   // Payload JSON devuelto por la DIAN.
  issuedAt?: Date | null;   // Fecha de emision al enviarse a la DIAN.
  createdAt?: Date;
}

/** Entidad de dominio ElectronicInvoice. */
export class ElectronicInvoice {
  public readonly id?: string;
  public orderId: string;
  public invoiceNumber: string;
  public cufe?: string | null;
  public status: InvoiceStatus;
  public xmlContent?: string | null;
  public pdfUrl?: string | null;
  public dianResponse?: unknown;
  public issuedAt?: Date | null;
  public readonly createdAt?: Date;

  constructor(props: ElectronicInvoiceProps) {
    this.id            = props.id;
    this.orderId       = props.orderId;
    this.invoiceNumber = props.invoiceNumber;
    this.cufe          = props.cufe;
    this.status        = props.status    ?? InvoiceStatus.DRAFT;
    this.xmlContent    = props.xmlContent;
    this.pdfUrl        = props.pdfUrl;
    this.dianResponse  = props.dianResponse;
    this.issuedAt      = props.issuedAt;
    this.createdAt     = props.createdAt;
  }
}
