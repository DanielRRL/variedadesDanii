/**
 * Implementacion Prisma del repositorio de Facturas Electronicas.
 * Traduce las operaciones del contrato IInvoiceRepository a consultas
 * Prisma contra la tabla "electronic_invoices".
 * La secuencia "invoice_seq" de PostgreSQL garantiza numeracion atomica.
 */

// prisma - Instancia singleton de PrismaClient con el adapter pg.
import prisma from "../../config/database";

// IInvoiceRepository e InvoiceListResult - Contrato y tipo de resultado paginado.
import { IInvoiceRepository, InvoiceListResult } from "../../domain/repositories/IInvoiceRepository";

// ElectronicInvoice e InvoiceStatus - Entidad y enum de dominio.
import { ElectronicInvoice, InvoiceStatus } from "../../domain/entities/ElectronicInvoice";

// AppError - Envuelve errores de Prisma en respuestas HTTP controladas.
import { AppError } from "../../utils/AppError";

/** Mapea un registro Prisma a la entidad de dominio ElectronicInvoice. */
function mapRecord(r: any): ElectronicInvoice {
  return new ElectronicInvoice({
    id:            r.id,
    orderId:       r.orderId,
    invoiceNumber: r.invoiceNumber,
    cufe:          r.cufe ?? null,
    status:        r.status as InvoiceStatus,
    xmlContent:    r.xmlContent ?? null,
    pdfUrl:        r.pdfUrl ?? null,
    dianResponse:  r.dianResponse ?? undefined,
    issuedAt:      r.issuedAt ?? null,
    createdAt:     r.createdAt,
  });
}

export class PrismaInvoiceRepository implements IInvoiceRepository {
  /**
   * Crea una nueva factura en estado DRAFT con el numero secuencial dado.
   * El caller debe obtener el numero previamente con getNextInvoiceNumber().
   * Lanza AppError 404 si el orderId no existe (FK violation).
   * Lanza AppError 409 si ya existe una factura para ese pedido o ese numero.
   */
  async create(data: { orderId: string; invoiceNumber: string }): Promise<ElectronicInvoice> {
    try {
      const r = await prisma.electronicInvoice.create({
        data: {
          orderId:       data.orderId,
          invoiceNumber: data.invoiceNumber,
        },
      });
      return mapRecord(r);
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw AppError.conflict("Ya existe una factura para este pedido o numero de factura.");
      }
      if (err?.code === "P2003") {
        throw AppError.notFound("Pedido no encontrado al crear factura.");
      }
      throw err;
    }
  }

  /**
   * Busca la factura de un pedido especifico.
   * Usa el indice @unique en orderId para busqueda O(1).
   * Retorna null si el pedido aun no tiene factura emitida.
   */
  async findByOrderId(orderId: string): Promise<ElectronicInvoice | null> {
    const r = await prisma.electronicInvoice.findUnique({ where: { orderId } });
    return r ? mapRecord(r) : null;
  }

  /**
   * Busca una factura por su numero secuencial (ej: "SEQF-0001").
   * Usa el indice @unique en invoiceNumber para busqueda O(1).
   * Retorna null si el numero no existe en la tabla.
   */
  async findByInvoiceNumber(number: string): Promise<ElectronicInvoice | null> {
    const r = await prisma.electronicInvoice.findUnique({ where: { invoiceNumber: number } });
    return r ? mapRecord(r) : null;
  }

  /**
   * Actualiza campos de la factura (estado, CUFE, XML, PDF, respuesta DIAN, etc.).
   * orderId e invoiceNumber no deben pasarse en data; son inmutables post-creacion.
   * Lanza AppError 404 si la factura no existe.
   */
  async update(id: string, data: Partial<ElectronicInvoice>): Promise<ElectronicInvoice> {
    try {
      const r = await prisma.electronicInvoice.update({
        where: { id },
        data: {
          ...(data.status       !== undefined && { status:       data.status }),
          ...(data.cufe         !== undefined && { cufe:         data.cufe }),
          ...(data.xmlContent   !== undefined && { xmlContent:   data.xmlContent }),
          ...(data.pdfUrl       !== undefined && { pdfUrl:       data.pdfUrl }),
          ...(data.dianResponse !== undefined && { dianResponse: data.dianResponse as any }),
          ...(data.issuedAt     !== undefined && { issuedAt:     data.issuedAt }),
        },
      });
      return mapRecord(r);
    } catch (err: any) {
      if (err?.code === "P2025") {
        throw AppError.notFound("Factura electronica no encontrada.");
      }
      throw err;
    }
  }

  /**
   * Lista paginada de facturas con filtro opcional por estado.
   * Ejecuta count() y findMany() en paralelo para optimizar el tiempo de respuesta.
   * page y limit tienen defaults de 1 y 20 respectivamente.
   */
  async findAll(filters: {
    status?: InvoiceStatus;
    page?: number;
    limit?: number;
  }): Promise<InvoiceListResult> {
    const page  = filters.page  ?? 1;
    const limit = filters.limit ?? 20;
    const where = filters.status ? { status: filters.status } : {};

    const [total, records] = await Promise.all([
      prisma.electronicInvoice.count({ where }),
      prisma.electronicInvoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
    ]);

    return { data: records.map(mapRecord), total };
  }

  /**
   * Obtiene el siguiente valor de la secuencia PostgreSQL "invoice_seq"
   * y lo formatea como SEQF-XXXX (padding con ceros a 4 digitos).
   * Ejemplos: 1 -> "SEQF-0001", 42 -> "SEQF-0042", 1000 -> "SEQF-1000".
   * nextval() es atomico y seguro para entornos con alta concurrencia.
   * La secuencia debe crearse antes con: CREATE SEQUENCE invoice_seq START 1;
   */
  async getNextInvoiceNumber(): Promise<string> {
    const result = await prisma.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval('invoice_seq')
    `;
    const val = Number(result[0].nextval);
    return `SEQF-${String(val).padStart(4, "0")}`;
  }
}
