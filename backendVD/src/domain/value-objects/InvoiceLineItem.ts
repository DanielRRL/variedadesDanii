/**
 * InvoiceLineItem — Objeto de valor que representa una linea de la factura.
 *
 * Contiene la descripcion del producto, cantidades, precios y calculos
 * de descuentos e impuestos conforme al Anexo Tecnico DIAN v1.9.
 *
 * Codigos de referencia:
 *   - UNSPSC 10000000 = Perfumes y fragancias (categoria por defecto).
 *   - Unidad "NAR" = Unidad de producto (por defecto).
 *   - Unidad "94"  = Onzas fluidas (para esencias por volumen).
 *   - Unidad "GRM" = Gramos.
 *   - IVA 0%: Variedades Danni opera como no responsable de IVA.
 */

export interface InvoiceLineItemProps {
  lineNumber: number;
  productId?: string;
  description: string;
  /** Codigo UNSPSC del producto. Default: "10000000" (perfumes y fragancias). */
  unspscCode: string;
  quantity: number;
  /** Codigo de unidad de medida DIAN. Default: "NAR" (unidad). */
  unitMeasureCode: string;
  /** Precio unitario en COP, sin impuestos. */
  unitPrice: number;
  /** quantity * unitPrice */
  subtotal: number;
  /** Porcentaje de descuento de la linea (0-100). */
  discountPercent: number;
  /** subtotal * discountPercent / 100 */
  discountAmount: number;
  /** Porcentaje de IVA aplicable (0, 5 o 19). */
  taxPercent: number;
  /** (subtotal - discountAmount) * taxPercent / 100 */
  taxAmount: number;
  /** subtotal - discountAmount + taxAmount */
  lineTotal: number;
}

export class InvoiceLineItem {
  readonly lineNumber: number;
  readonly productId?: string;
  readonly description: string;
  readonly unspscCode: string;
  readonly quantity: number;
  readonly unitMeasureCode: string;
  readonly unitPrice: number;
  readonly subtotal: number;
  readonly discountPercent: number;
  readonly discountAmount: number;
  readonly taxPercent: number;
  readonly taxAmount: number;
  readonly lineTotal: number;

  constructor(props: InvoiceLineItemProps) {
    this.lineNumber      = props.lineNumber;
    this.productId       = props.productId;
    this.description     = props.description;
    this.unspscCode      = props.unspscCode;
    this.quantity        = props.quantity;
    this.unitMeasureCode = props.unitMeasureCode;
    this.unitPrice       = props.unitPrice;
    this.subtotal        = props.subtotal;
    this.discountPercent = props.discountPercent;
    this.discountAmount  = props.discountAmount;
    this.taxPercent      = props.taxPercent;
    this.taxAmount       = props.taxAmount;
    this.lineTotal       = props.lineTotal;
  }

  /**
   * Crea un InvoiceLineItem calculando automaticamente subtotal, descuento,
   * impuesto y total de la linea a partir de los parametros basicos.
   */
  static create(params: {
    lineNumber: number;
    productId?: string;
    description: string;
    /** Codigo UNSPSC. Default: "10000000". */
    unspscCode?: string;
    quantity: number;
    /** Codigo de unidad DIAN. Default: "NAR". */
    unitMeasureCode?: string;
    unitPrice: number;
    /** Porcentaje de descuento 0-100. Default: 0. */
    discountPercent?: number;
    /** Porcentaje de IVA 0-100. Default: 0. */
    taxPercent?: number;
  }): InvoiceLineItem {
    const unspscCode      = params.unspscCode      ?? "10000000";
    const unitMeasureCode = params.unitMeasureCode ?? "NAR";
    const discountPercent = params.discountPercent ?? 0;
    const taxPercent      = params.taxPercent      ?? 0;

    const subtotal       = Math.round(params.quantity * params.unitPrice);
    const discountAmount = Math.round(subtotal * discountPercent / 100);
    const taxBase        = subtotal - discountAmount;
    const taxAmount      = Math.round(taxBase * taxPercent / 100);
    const lineTotal      = taxBase + taxAmount;

    return new InvoiceLineItem({
      lineNumber: params.lineNumber,
      productId:  params.productId,
      description: params.description,
      unspscCode,
      quantity:        params.quantity,
      unitMeasureCode,
      unitPrice:       params.unitPrice,
      subtotal,
      discountPercent,
      discountAmount,
      taxPercent,
      taxAmount,
      lineTotal,
    });
  }
}
