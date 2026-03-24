/**
 * IInvoiceGateway — Contrato del gateway de facturacion electronica.
 *
 * Esta interfaz abstrae la comunicacion con la DIAN (o cualquier proveedor
 * alternativo) de forma que InvoiceService nunca dependa de una implementacion
 * concreta. Para cambiar del STUB a la integracion real solo hay que:
 *   1. Crear DianSoapClientReal.ts implementando esta interfaz.
 *   2. Cambiar el binding en app.ts (una sola linea).
 *
 * Implementaciones:
 *   - DianSoapClient   (src/infrastructure/invoice/DianSoapClient.ts)   — STUB
 *   - DianSoapClientReal (futuro)                                        — produccion
 */

import { InvoiceData } from "../../domain/value-objects/InvoiceData";

/**
 * Resultado devuelto por sendInvoice().
 * Contiene toda la informacion necesaria para actualizar el registro
 * de la factura en la base de datos.
 */
export interface InvoiceGatewayResult {
  /** true si la DIAN (o el stub) acepto el documento. */
  success: boolean;
  /** Identificador de rastreo asignado por la DIAN. */
  trackId?: string;
  /** Codigo Unico de Factura Electronica (SHA-384). */
  cufe?: string;
  /** Codigo de respuesta de la DIAN ("00" = aceptado). */
  statusCode: string;
  /** Descripcion legible del codigo de respuesta. */
  statusDescription: string;
  /** Errores de validacion devueltos por la DIAN (si los hay). */
  errors?: string[];
  /** XML UBL 2.1 firmado digitalmente (XAdES-BES). */
  xmlSigned?: string;
  /**
   * true si se activo el modo contingencia (la DIAN no estaba disponible
   * y el documento se emitio offline con numeracion de contingencia).
   */
  isContingency: boolean;
}

/**
 * Resultado de checkStatus() para consultar el estado de un documento
 * enviado previamente.
 */
export interface InvoiceStatusResult {
  trackId: string;
  statusCode: string;
  statusDescription: string;
  cufe?: string;
  /** true si el documento fue validado y aceptado por la DIAN. */
  isValid: boolean;
  errors?: string[];
}

/** Contrato del gateway de facturacion electronica. */
export interface IInvoiceGateway {
  /**
   * Envia un documento de factura a la DIAN (o al sistema configurado).
   * @param invoiceData - Payload completo de la factura.
   * @returns Resultado con CUFE, trackId y estado de la operacion.
   */
  sendInvoice(invoiceData: InvoiceData): Promise<InvoiceGatewayResult>;

  /**
   * Consulta el estado de procesamiento de un documento enviado.
   * Util cuando sendInvoice devuelve un estado intermedio (procesando).
   * @param trackId - Identificador asignado por la DIAN en sendInvoice().
   */
  checkStatus(trackId: string): Promise<InvoiceStatusResult>;
}
