/**
 * Rutas de administracion (dashboard y reportes).
 * Solo accesibles por usuarios con rol ADMIN.
 * Todas las operaciones son de lectura.
 */

// Router - Crea un enrutador modular de Express.
import { Router } from "express";

// AdminController - Controlador de dashboard y reportes.
import { AdminController } from "../controllers/AdminController";

// authMiddleware - Protege rutas verificando JWT.
import { authMiddleware } from "../middleware/authMiddleware";

// roleMiddleware - Restringe acceso por rol.
import { roleMiddleware } from "../middleware/roleMiddleware";

// dailySalesValidator - Valida query params de ventas diarias.
import { dailySalesValidator } from "../validators/adminValidator";

// validate - Middleware que revisa errores de express-validator.
import { validate } from "../validators/validate";

/**
 * Crea y retorna el router de administracion.
 * @param adminController - Controlador inyectado desde app.ts.
 *
 * GET /dashboard - Resumen general del negocio hoy.
 * GET /reports/daily-sales?from=YYYY-MM-DD&to=YYYY-MM-DD - Ventas por dia.
 * GET /reports/top-products?limit=10 - Productos mas vendidos.
 * GET /reports/low-stock?threshold=500 - Esencias con stock bajo.
 */
export const createAdminRoutes = (
  adminController: AdminController
): Router => {
  const router = Router();

  // Todas las rutas admin requieren autenticacion y rol ADMIN
  router.use(authMiddleware);
  router.use(roleMiddleware("ADMIN"));

  // Dashboard general
  router.get("/dashboard", adminController.getDashboard);

  // Reportes
  router.get(
    "/reports/daily-sales",
    dailySalesValidator,
    validate,
    adminController.getDailySales
  );
  router.get("/reports/top-products", adminController.getTopProducts);
  router.get("/reports/low-stock", adminController.getLowStock);

  // Descargas de reportes
  router.get(
    "/reports/sales/csv",
    dailySalesValidator,
    validate,
    adminController.downloadSalesCSV
  );
  router.get(
    "/reports/sales/pdf",
    dailySalesValidator,
    validate,
    adminController.downloadSalesPDF
  );
  router.get("/reports/inventory/csv", adminController.downloadInventoryCSV);
  router.get("/reports/clients/csv",   adminController.downloadClientsCSV);

  return router;
};
