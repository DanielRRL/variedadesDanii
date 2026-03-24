/**
 * ReportService — Servicio de exportacion de reportes administrativos.
 *
 * Genera archivos descargables (CSV y PDF) para el panel de administracion.
 * Los reportes estan disenados para ser consumidos por el controlador y
 * devueltos como buffers en la respuesta HTTP (Content-Disposition: attachment).
 *
 * Librerías usadas:
 *   - csv-writer (createObjectCsvStringifier) — Genera CSV como string en memoria.
 *   - jspdf + jspdf-autotable               — Genera PDF con tablas formateadas.
 *
 * Todos los metodos retornan Promise<Buffer> para facilitar el envio HTTP directo.
 * Los queries van directo a Prisma (no via AdminService) para poder incluir
 * relaciones anidadas (user, items, producto) que AdminService no expone.
 */

// prisma - Instancia singleton del cliente de base de datos.
import prisma from "../../config/database";
import { OrderStatus } from "@prisma/client";

// createObjectCsvStringifier - Construye CSV como string en memoria (sin escibir a disco).
import { createObjectCsvStringifier } from "csv-writer";

// jsPDF - Constructor del documento PDF.
import { jsPDF } from "jspdf";

// autoTable - Plugin de jspdf que agrega soporte para tablas con cabeceras.
import autoTable from "jspdf-autotable";

// AppError - Para validacion de parametros de fecha.
import { AppError } from "../../utils/AppError";

/** Maximo de dias permitidos en un reporte de ventas (evita queries enormes). */
const MAX_DATE_RANGE_DAYS = 365;

export class ReportService {
  /**
   * Solo necesita acceso directo a Prisma para hacer queries con relaciones.
   * No depende de AdminService/AdminRepo porque necesita datos anidados
   * (usuario, items, producto) que las interfaces admin no exponen.
   */
  constructor() {}

  // ──────────────────────────────────────────────────────────────────────────
  // VENTAS — CSV
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Genera un CSV de ventas en el rango de fechas indicado.
   *
   * Columnas:
   *   order_number, date, client_name, client_phone, items_summary,
   *   subtotal, discount, total, payment_method, status
   *
   * Solo incluye ordenes en estado PAID o posterior (excluye PENDING y CANCELLED).
   *
   * @param filters.from - Fecha de inicio del reporte (inclusiva).
   * @param filters.to   - Fecha de fin del reporte (inclusiva).
   * @returns Buffer UTF-8 con contenido CSV listo para descarga.
   */
  async generateSalesCSV(filters: { from: Date; to: Date }): Promise<Buffer> {
    this.validateDateRange(filters.from, filters.to);

    // Extender "to" hasta el final del dia para incluir el dia completo.
    const toEndOfDay = new Date(filters.to);
    toEndOfDay.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: filters.from, lte: toEndOfDay },
        status: { in: [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
      },
      include: {
        user: { select: { name: true, phone: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Construir el resumen de items como string legible: "Producto A x2, Producto B x1"
    // `order: any` — Prisma pierde las relaciones incluidas en la inferencia de tipos
    // cuando la query es compleja; el mismo patron usan los repositorios (PrismaOrderRepository).
    const rows = orders.map((order: any) => {
      const itemsSummary = order.items
        .map((item: any) => `${item.product?.name ?? "Producto"} x${item.quantity}`)
        .join("; ");

      return {
        order_number:   order.orderNumber ?? order.id.slice(0, 8),
        date:           order.createdAt.toISOString().split("T")[0],
        client_name:    order.user?.name  ?? "N/A",
        client_phone:   order.user?.phone ?? "N/A",
        items_summary:  itemsSummary,
        subtotal:       order.subtotal.toFixed(2),
        discount:       order.discount.toFixed(2),
        total:          order.total.toFixed(2),
        payment_method: order.paymentMethod,
        status:         order.status,
      };
    });

    // Usar createObjectCsvStringifier: no escribe a disco, genera string directamente.
    const stringifier = createObjectCsvStringifier({
      header: [
        { id: "order_number",   title: "Numero de Orden" },
        { id: "date",           title: "Fecha" },
        { id: "client_name",    title: "Cliente" },
        { id: "client_phone",   title: "Telefono" },
        { id: "items_summary",  title: "Productos" },
        { id: "subtotal",       title: "Subtotal COP" },
        { id: "discount",       title: "Descuento COP" },
        { id: "total",          title: "Total COP" },
        { id: "payment_method", title: "Metodo de Pago" },
        { id: "status",         title: "Estado" },
      ],
    });

    // Encabezados + filas como string CSV con BOM UTF-8 para Excel.
    const csvContent =
      "\uFEFF" + // BOM: permite que Excel abra el CSV con tildes correctamente.
      stringifier.getHeaderString() +
      stringifier.stringifyRecords(rows);

    return Buffer.from(csvContent, "utf8");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VENTAS — PDF
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Genera un PDF de ventas con cabecera, totales resumidos y tabla detallada.
   *
   * Estructura del PDF:
   *   1. Cabecera: "VARIEDADES DANII — Reporte de Ventas"
   *   2. Rango de fechas del reporte.
   *   3. Resumen: Total Ventas, No. Ordenes, Ticket Promedio.
   *   4. Tabla detallada (mismas columnas que el CSV).
   *
   * @param filters.from - Fecha de inicio del reporte (inclusiva).
   * @param filters.to   - Fecha de fin del reporte (inclusiva).
   * @returns Buffer con bytes del PDF listo para descarga.
   */
  async generateSalesPDF(filters: { from: Date; to: Date }): Promise<Buffer> {
    this.validateDateRange(filters.from, filters.to);

    const toEndOfDay = new Date(filters.to);
    toEndOfDay.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: filters.from, lte: toEndOfDay },
        status: { in: [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
      },
      include: {
        user: { select: { name: true, phone: true } },
        items: {
          include: { product: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calcular totales para el resumen.
    const totalSales  = orders.reduce((s, o: any) => s + o.total, 0);
    const orderCount  = orders.length;
    const avgTicket   = orderCount > 0 ? totalSales / orderCount : 0;

    const fromStr = filters.from.toISOString().split("T")[0];
    const toStr   = filters.to.toISOString().split("T")[0];

    // Crear documento PDF en orientacion horizontal para que caben todas las columnas.
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // ── Cabecera ──────────────────────────────────────────────────────────────
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("VARIEDADES DANII", 148.5, 18, { align: "center" });

    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.text("Reporte de Ventas", 148.5, 26, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Periodo: ${fromStr} al ${toStr}`, 148.5, 33, { align: "center" });

    // ── Linea separadora ─────────────────────────────────────────────────────
    doc.setLineWidth(0.4);
    doc.line(14, 37, 283, 37);

    // ── Resumen de totales ────────────────────────────────────────────────────
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN", 14, 44);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Total Ventas: $${totalSales.toLocaleString("es-CO")} COP    |    ` +
      `Ordenes: ${orderCount}    |    ` +
      `Ticket Promedio: $${Math.round(avgTicket).toLocaleString("es-CO")} COP`,
      14,
      51
    );

    // ── Tabla detallada ───────────────────────────────────────────────────────
    const tableRows = orders.map((order: any) => {
      const itemsSummary = order.items
        .map((item: any) => `${item.product?.name ?? "Producto"} x${item.quantity}`)
        .join(", ");

      return [
        order.orderNumber ?? order.id.slice(0, 8),
        order.createdAt.toISOString().split("T")[0],
        order.user?.name  ?? "N/A",
        order.user?.phone ?? "N/A",
        itemsSummary,
        `$${order.subtotal.toLocaleString("es-CO")}`,
        `$${order.discount.toLocaleString("es-CO")}`,
        `$${order.total.toLocaleString("es-CO")}`,
        order.paymentMethod,
        order.status,
      ];
    });

    autoTable(doc, {
      startY:    57,
      head:      [["# Orden", "Fecha", "Cliente", "Telefono", "Productos", "Subtotal", "Descuento", "Total", "Pago", "Estado"]],
      body:      tableRows,
      styles:    { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [33, 33, 33], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        4: { cellWidth: 55 }, // Columna Productos: mas ancha.
      },
    });

    // Pie de pagina con fecha de generacion.
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(
        `Generado el ${new Date().toLocaleString("es-CO")} | Pagina ${i} de ${pageCount}`,
        148.5,
        205,
        { align: "center" }
      );
    }

    // jsPDF devuelve un ArrayBuffer; lo convertimos a Buffer de Node.
    return Buffer.from(doc.output("arraybuffer"));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INVENTARIO — CSV
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Genera un CSV del estado actual del inventario de esencias.
   *
   * Columnas:
   *   essence_name, current_stock_ml, current_stock_oz, min_stock_ml, status
   *
   * Status:
   *   - OK       → stock >= 1000 ml
   *   - LOW      → stock entre 200 ml y 999 ml
   *   - CRITICAL → stock < 200 ml
   *
   * @returns Buffer UTF-8 con contenido CSV listo para descarga.
   */
  async generateInventoryCSV(): Promise<Buffer> {
    const essences = await prisma.essence.findMany({
      where:   { active: true },
      orderBy: { name: "asc" },
      select:  { id: true, name: true },
    });

    // Para cada esencia, calcular stock como IN - OUT de sus movimientos.
    const rows = await Promise.all(
      essences.map(async (essence) => {
        const inSum = await prisma.essenceMovement.aggregate({
          where: { essenceId: essence.id, type: "IN" },
          _sum:  { ml: true },
        });
        const outSum = await prisma.essenceMovement.aggregate({
          where: { essenceId: essence.id, type: "OUT" },
          _sum:  { ml: true },
        });

        const stockMl  = (inSum._sum.ml ?? 0) - (outSum._sum.ml ?? 0);
        const stockOz  = (stockMl / 29.5735).toFixed(2); // 1 oz = 29.5735 ml
        const minStock = 200; // Umbral minimo de alerta para reabastecimiento.

        // Clasificar el estado del stock segun umbrales de negocio.
        let status: string;
        if (stockMl >= 1000) {
          status = "OK";
        } else if (stockMl >= 200) {
          status = "LOW";
        } else {
          status = "CRITICAL";
        }

        return {
          essence_name:      essence.name,
          current_stock_ml:  stockMl.toString(),
          current_stock_oz:  stockOz,
          min_stock_ml:      minStock.toString(),
          status,
        };
      })
    );

    const stringifier = createObjectCsvStringifier({
      header: [
        { id: "essence_name",     title: "Esencia" },
        { id: "current_stock_ml", title: "Stock Actual (ml)" },
        { id: "current_stock_oz", title: "Stock Actual (oz)" },
        { id: "min_stock_ml",     title: "Stock Minimo (ml)" },
        { id: "status",           title: "Estado" },
      ],
    });

    const csvContent =
      "\uFEFF" +
      stringifier.getHeaderString() +
      stringifier.stringifyRecords(rows);

    return Buffer.from(csvContent, "utf8");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CLIENTES — CSV
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Genera un CSV con el historial de clientes y datos de fidelizacion.
   *
   * Columnas:
   *   name, phone, email, loyalty_level, points, total_orders, total_spent, last_order_date
   *
   * Solo incluye usuarios con rol CLIENT y cuenta activa.
   * Suma el total gastado solo de ordenes PAID o posterior (excluye PENDING/CANCELLED).
   *
   * @returns Buffer UTF-8 con contenido CSV listo para descarga.
   */
  async generateClientsCSV(): Promise<Buffer> {
    const clients = await prisma.user.findMany({
      where: { role: "CLIENT", active: true },
      include: {
        loyaltyAccount: { select: { level: true, points: true } },
        orders: {
          where: {
            status: { in: [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
          },
          select:  { total: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // `client: any` — misma razon que en generateSalesCSV: relaciones no inferidas.
    const rows = clients.map((client: any) => {
      const totalSpent  = client.orders.reduce((s: number, o: any) => s + o.total, 0);
      const lastOrder   = client.orders[0]?.createdAt; // Ya ordenado desc.
      const lastOrderDate = lastOrder
        ? lastOrder.toISOString().split("T")[0]
        : "Sin ordenes";

      return {
        name:             client.name,
        phone:            client.phone,
        email:            client.email,
        loyalty_level:    client.loyaltyAccount?.level   ?? "BASIC",
        points:           (client.loyaltyAccount?.points ?? 0).toString(),
        total_orders:     client.orders.length.toString(),
        total_spent:      totalSpent.toFixed(2),
        last_order_date:  lastOrderDate,
      };
    });

    const stringifier = createObjectCsvStringifier({
      header: [
        { id: "name",            title: "Nombre" },
        { id: "phone",           title: "Telefono" },
        { id: "email",           title: "Correo" },
        { id: "loyalty_level",   title: "Nivel Fidelizacion" },
        { id: "points",          title: "Puntos" },
        { id: "total_orders",    title: "Ordenes Totales" },
        { id: "total_spent",     title: "Total Gastado COP" },
        { id: "last_order_date", title: "Ultima Orden" },
      ],
    });

    const csvContent =
      "\uFEFF" +
      stringifier.getHeaderString() +
      stringifier.stringifyRecords(rows);

    return Buffer.from(csvContent, "utf8");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Utilidades privadas
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Valida que el rango de fechas sea coherente y no exceda el maximo.
   * Lanza AppError.badRequest si el rango es invalido.
   */
  private validateDateRange(from: Date, to: Date): void {
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw AppError.badRequest("Fechas invalidas. Usar formato YYYY-MM-DD.");
    }
    if (from >= to) {
      throw AppError.badRequest("La fecha 'from' debe ser anterior a 'to'.");
    }
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > MAX_DATE_RANGE_DAYS) {
      throw AppError.badRequest(
        `El rango no puede superar ${MAX_DATE_RANGE_DAYS} dias.`
      );
    }
  }
}
