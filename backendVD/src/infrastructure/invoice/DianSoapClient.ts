/**
 * ============================================================
 *  ██╗    ██╗ █████╗ ██████╗ ███╗   ██╗██╗███╗   ██╗ ██████╗
 *  ██║    ██║██╔══██╗██╔══██╗████╗  ██║██║████╗  ██║██╔════╝
 *  ██║ █╗ ██║███████║██████╔╝██╔██╗ ██║██║██╔██╗ ██║██║  ███╗
 *  ██║███╗██║██╔══██║██╔══██╗██║╚██╗██║██║██║╚██╗██║██║   ██║
 *  ╚███╔███╔╝██║  ██║██║  ██║██║ ╚████║██║██║ ╚████║╚██████╔╝
 *   ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝ ╚═════╝
 * ============================================================
 *  STUB DE INTEGRACION DIAN — NO LISTO PARA PRODUCCION
 * ============================================================
 *
 * Este archivo es un PLACEHOLDER intencional que simula el comportamiento
 * del cliente SOAP de la DIAN sin conectarse realmente a ningun servicio.
 *
 * POR QUE EXISTE ESTE STUB:
 *   La integracion real con la DIAN requiere:
 *   1. Certificado digital .PFX (Certicamara o Camerfirma ~$500.000 COP/año).
 *   2. Registro en Muisca como Software de Facturacion Propio.
 *   3. 30 documentos de prueba en el ambiente habilitador de la DIAN.
 *   4. Construccion del XML UBL 2.1 con todos los campos del Catalogo DIAN.
 *   5. Firma digital XAdES-BES embebida en el XML.
 *   6. Envio SOAP comprimido con GZIP al endpoint de la DIAN.
 *
 * CUANDO REEMPLAZAR ESTE STUB:
 *   - Cuando se tenga el certificado digital en ./certs/certificado.pfx
 *   - Despues de completar el SET de pruebas de habilitacion DIAN
 *   - Ver docs/DIAN_INTEGRATION.md para el proceso completo paso a paso
 *
 * COMPORTAMIENTO ACTUAL DEL STUB:
 *   - sendInvoice() → devuelve exito simulado con CUFE de prueba
 *   - checkStatus() → devuelve estado "en proceso" simulado
 *   - Las facturas se guardan en BD con estado SENT (simulado)
 *   - Los clientes reciben email de confirmacion (funcionamiento real)
 *
 * COMO REEMPLAZAR (sin tocar InvoiceService):
 *   En src/app.ts cambiar:
 *     import { DianSoapClient } from "./infrastructure/invoice/DianSoapClient";
 *   por:
 *     import { DianSoapClientReal } from "./infrastructure/invoice/DianSoapClientReal";
 *   y cambiar la instanciacion. InvoiceService no necesita ningun cambio.
 */

import crypto from "crypto";

import {
  IInvoiceGateway,
  InvoiceGatewayResult,
  InvoiceStatusResult,
} from "../../application/services/IInvoiceGateway";
import { InvoiceData } from "../../domain/value-objects/InvoiceData";
import logger from "../../utils/logger";

/**
 * Implementacion STUB del gateway de facturacion DIAN.
 * Implementa IInvoiceGateway para que InvoiceService nunca sepa que es un stub.
 *
 * Al reemplazarlo por DianSoapClientReal, el cambio es solo en app.ts.
 */
export class DianSoapClient implements IInvoiceGateway {

  // ──────────────────────────────────────────────────────────────────────────
  // METODO PUBLICO: sendInvoice
  // ──────────────────────────────────────────────────────────────────────────

  async sendInvoice(invoiceData: InvoiceData): Promise<InvoiceGatewayResult> {
    logger.warn(
      "[DianSoapClient STUB] sendInvoice llamado. " +
      "La factura NO fue enviada realmente a la DIAN. " +
      `Factura: ${invoiceData.invoiceNumber} | Orden: ${invoiceData.orderId}`
    );

    // Calcular un CUFE simulado con la misma estructura SHA-384 que usaria el real.
    const stubCufe = this.computeStubCufe(invoiceData);

    // Construir un XML de ejemplo (no valido para la DIAN).
    const stubXml = this.buildStubUblXml(invoiceData, stubCufe);

    return {
      success:            true,
      trackId:            `STUB-TRACK-${crypto.randomBytes(8).toString("hex").toUpperCase()}`,
      cufe:               stubCufe,
      statusCode:         "00",
      statusDescription:  "STUB: Documento aceptado (simulacion local — no enviado a la DIAN)",
      xmlSigned:          stubXml,
      isContingency:      false,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // METODO PUBLICO: checkStatus
  // ──────────────────────────────────────────────────────────────────────────

  async checkStatus(trackId: string): Promise<InvoiceStatusResult> {
    logger.warn(
      `[DianSoapClient STUB] checkStatus llamado para trackId=${trackId}. ` +
      "Retornando respuesta simulada."
    );

    return {
      trackId,
      statusCode:        "00",
      statusDescription: "STUB: Documento en proceso (simulacion local)",
      isValid:           true,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // METODOS PRIVADOS STUB
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * STUB: Simula el calculo del CUFE segun Anexo Tecnico DIAN v1.9 sec. 8.2.
   *
   * Formula real que aqui NO se implementa completamente:
   *   SHA384(NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 +
   *          CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot +
   *          NitOFE + NumAdq + ClTec + TipoAmbiente)
   *
   * Ver docs/DIAN_INTEGRATION.md seccion 3.2 para la implementacion real.
   */
  private computeStubCufe(invoiceData: InvoiceData): string {
    const raw = [
      invoiceData.invoiceNumber,
      invoiceData.issueDate,
      invoiceData.total.toFixed(2),
      invoiceData.issuer.documentNumber,
      invoiceData.buyer.documentNumber,
      "STUB_CLAVE_TECNICA",
    ].join("|");

    return crypto.createHash("sha384").update(raw, "utf8").digest("hex");
  }

  /**
   * STUB: Genera un XML UBL 2.1 de ejemplo para testing.
   *
   * El XML real requiere:
   *   - Todos los campos del Catalogo de Estructura DIAN.
   *   - Firma XAdES-BES embebida en ext:UBLExtensions.
   *   - Validacion exitosa contra el XSD oficial de la DIAN.
   *
   * Librerias necesarias para la implementacion real:
   *   npm install xmlbuilder2 xml-crypto node-forge
   *
   * Ver docs/DIAN_INTEGRATION.md seccion 3.1 para la estructura requerida.
   */
  private buildStubUblXml(invoiceData: InvoiceData, cufe: string): string {
    const issueDate = invoiceData.issueDate.split("T")[0];
    const lines = invoiceData.items
      .map(
        (item) =>
          `  <!-- Linea ${item.lineNumber}: ${item.description} | ` +
          `Qty:${item.quantity} x $${item.unitPrice} = $${item.lineTotal} -->`
      )
      .join("\n");

    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<!-- STUB XML — NO VALIDO PARA LA DIAN — Ver docs/DIAN_INTEGRATION.md -->`,
      `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">`,
      `  <ID>${invoiceData.invoiceNumber}</ID>`,
      `  <IssueDate>${issueDate}</IssueDate>`,
      `  <InvoiceTypeCode>${invoiceData.invoiceTypeCode}</InvoiceTypeCode>`,
      `  <CUFE>${cufe}</CUFE>`,
      `  <NitEmisor>${invoiceData.issuer.documentNumber}</NitEmisor>`,
      `  <DocumentoAdquirente>${invoiceData.buyer.documentNumber}</DocumentoAdquirente>`,
      lines,
      `  <Total currency="COP">${invoiceData.total.toFixed(2)}</Total>`,
      `  <OrderReference>${invoiceData.orderId}</OrderReference>`,
      `</Invoice>`,
    ].join("\n");
  }

  /**
   * STUB: Placeholder para la firma digital XAdES-BES.
   *
   * La implementacion real requiere:
   *   1. Cargar el .PFX con node-forge.
   *   2. Extraer clave privada y cadena de certificados.
   *   3. Canonicalizar el XML (C14N exclusivo, sin comentarios).
   *   4. Firmar el hash SHA256 del XML canonicalizado con RSA.
   *   5. Insertar el bloque <ds:Signature> en <ext:UBLExtensions>.
   *
   * Ver docs/DIAN_INTEGRATION.md seccion 3.3.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private signXmlStub(_xmlContent: string): string {
    // Produccion: usar xml-crypto + node-forge para XAdES-BES
    return _xmlContent;
  }
}
