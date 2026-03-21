/**
 * Contrato del repositorio de Facturas Electronicas (ElectronicInvoice).
 * Define las operaciones de persistencia para el ciclo de vida de
 * facturas electronicas conforme a la normativa DIAN (Colombia).
 * La logica de construccion del XML UBL 2.1, firma digital y comunicacion
 * con la DIAN reside en la capa de Application/Services.
 */

import { ElectronicInvoice, InvoiceStatus } from "../entities/ElectronicInvoice";

/**
 * Resultado paginado de facturas.
 * data  = registros de la pagina solicitada.
 * total = cantidad total de registros (para calcular numero de paginas).
 */
export interface InvoiceListResult {
  data: ElectronicInvoice[];
  total: number;
}

/**
 * Interfaz que deben implementar todos los repositorios de facturas.
 * Toda implementacion concreta reside en infrastructure/repositories/.
 */
export interface IInvoiceRepository {
  /**
   * Crea un nuevo registro de factura en estado DRAFT.
   * El numero de factura debe calcularse antes de llamar este metodo
   * usando getNextInvoiceNumber().
   * @param data.orderId        - UUID del pedido a facturar.
   * @param data.invoiceNumber  - Numero en formato SEQF-0001.
   */
  create(data: {
    orderId: string;
    invoiceNumber: string;
  }): Promise<ElectronicInvoice>;

  /**
   * Busca la factura asociada a un pedido especifico.
   * Retorna null si el pedido aun no tiene factura emitida.
   * @param orderId - UUID del pedido.
   */
  findByOrderId(orderId: string): Promise<ElectronicInvoice | null>;

  /**
   * Busca una factura por su numero secuencial.
   * Usado para evitar duplicados y para consulta directa por numero.
   * Retorna null si el numero no existe.
   * @param number - Numero de factura en formato SEQF-0001.
   */
  findByInvoiceNumber(number: string): Promise<ElectronicInvoice | null>;

  /**
   * Actualiza campos de la factura (estado, CUFE, XML, PDF, respuesta DIAN).
   * Nunca debe actualizarse orderId ni invoiceNumber tras la creacion.
   * @param id   - UUID de la factura a actualizar.
   * @param data - Campos a modificar (parcial, cualquier campo de ElectronicInvoice).
   */
  update(id: string, data: Partial<ElectronicInvoice>): Promise<ElectronicInvoice>;

  /**
   * Obtiene una lista paginada de facturas con filtros opcionales.
   * Usado por el panel administrativo para gestionar facturas.
   * @param filters.status - Filtrar por estado (DRAFT, SENT, ACCEPTED, REJECTED).
   * @param filters.page   - Pagina solicitada (base 1, default 1).
   * @param filters.limit  - Registros por pagina (default 20).
   */
  findAll(filters: {
    status?: InvoiceStatus;
    page?: number;
    limit?: number;
  }): Promise<InvoiceListResult>;

  /**
   * Obtiene el siguiente numero de factura de la secuencia PostgreSQL
   * "invoice_seq" y lo formatea como SEQF-XXXX (padding con ceros a 4 digitos).
   * Ejemplo: primer valor -> "SEQF-0001", decimo -> "SEQF-0010".
   * Usa SELECT nextval('invoice_seq') mediante prisma.$queryRaw para
   * garantizar atomicidad y evitar colisiones en entornos concurrentes.
   */
  getNextInvoiceNumber(): Promise<string>;
}
