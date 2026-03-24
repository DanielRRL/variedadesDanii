/**
 * InvoiceController — Controlador de facturas electronicas.
 *
 * Endpoints expuestos:
 *   GET  /api/invoices/:orderId              — Ver factura de una orden (cliente/admin).
 *   GET  /api/invoices/:orderId/pdf          — Descargar PDF (stub, 501 por ahora).
 *   POST /api/admin/invoices/:orderId/retry  — Reintentar factura DRAFT (admin).
 *   GET  /api/admin/invoices                 — Listar facturas paginadas (admin).
 *
 * Control de acceso:
 *   - getByOrder: cualquier usuario autenticado puede ver la factura de su propia
 *     orden. Los admins pueden ver cualquiera. La validacion de ownership se
 *     hace en la capa de rutas mediante authMiddleware.
 *   - retryInvoice / listInvoices: solo ADMIN via roleMiddleware.
 */

import { Request, Response, NextFunction } from "express";

import { InvoiceService } from "../../application/services/InvoiceService";
import { IInvoiceRepository } from "../../domain/repositories/IInvoiceRepository";
import { InvoiceStatus } from "../../domain/entities/ElectronicInvoice";
import { AppError } from "../../utils/AppError";
import { param } from "../../utils/param";
import logger from "../../utils/logger";

export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly invoiceRepo: IInvoiceRepository,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/invoices/:orderId
   * Devuelve la factura asociada a una orden.
   * 404 si la orden no tiene factura aun.
   */
  getByOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = param(req, "orderId");
      const invoice = await this.invoiceService.getInvoiceSummary(orderId);

      if (!invoice) {
        throw AppError.notFound("No existe factura para esta orden");
      }

      res.json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/invoices/:orderId/pdf
   * Descarga del PDF de la factura.
   *
   * STUB 501: la generacion de PDF requiere integracion real con la DIAN
   * (que provee el PDF) o una libreria de generacion (pdfmake, puppeteer).
   * Una vez disponible, la URL del PDF se almacena en invoice.pdfUrl.
   */
  downloadPdf = async (_req: Request, res: Response): Promise<void> => {
    res.status(501).json({
      success: false,
      message:
        "Descarga de PDF no disponible aun. " +
        "El campo 'pdfUrl' de la factura contendra la URL cuando la DIAN " +
        "este integrada. Ver docs/DIAN_INTEGRATION.md.",
    });
  };

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/admin/invoices/:orderId/retry
   * Reintenta el envio de una factura que quedo en estado DRAFT.
   * Requiere rol ADMIN.
   */
  retryInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = param(req, "orderId");
      const adminId = (req as any).userId as string;

      const invoice = await this.invoiceService.retryDraftInvoice(orderId, adminId);

      logger.info("InvoiceController: factura reintentada por admin", {
        adminId,
        orderId,
        invoiceNumber: invoice.invoiceNumber,
        newStatus:     invoice.status,
      });

      res.json({
        success: true,
        message: `Factura ${invoice.invoiceNumber} reintentada. Estado: ${invoice.status}`,
        data:    invoice,
      });
    } catch (err) {
      next(err);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/admin/invoices?page=1&limit=20&status=DRAFT
   * Lista paginada de facturas para el panel administrativo.
   * El parametro 'status' es opcional; si se omite devuelve todas.
   * Requiere rol ADMIN.
   */
  listInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page   = Math.max(1, parseInt(req.query.page  as string || "1",  10));
      const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit as string || "20", 10)));
      const status = req.query.status as InvoiceStatus | undefined;

      const result = await this.invoiceRepo.findAll({ status, page, limit });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}
