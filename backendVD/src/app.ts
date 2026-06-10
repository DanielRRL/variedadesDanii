/**
 * Composition Root de la aplicacion Variedades Danni.
 * Aqui se configura Express, se instancian todas las dependencias
 * con inyeccion manual (sin contenedor IoC) y se montan las rutas.
 *
 * Flujo: Repositorios -> Servicios -> Casos de uso -> Controladores -> Rutas
 *
 * Este patron de Composition Root mantiene desacopladas las capas:
 * dominio, aplicacion e infraestructura no se conocen entre si,
 * solo este archivo las conecta.
 */

// express - Framework HTTP. Crea la app y maneja request/response.
import express from "express";
import path from "path";

// cors - Middleware que habilita Cross-Origin Resource Sharing para el frontend.
import cors from "cors";

// helmet - Middleware de seguridad que configura headers HTTP seguros.
import helmet from "helmet";

// morgan - Logger de requests HTTP (formato dev o combined segun entorno).
import morgan from "morgan";

// crypto - Para generar requestId unico por cada request.
import { randomUUID } from "crypto";

// rateLimit - Limita la cantidad de requests por ventana de tiempo.
import rateLimit from "express-rate-limit";

// hpp - Protege contra HTTP Parameter Pollution.
import hpp from "hpp";

// env - Variables de entorno centralizadas (puerto, JWT, CORS, etc).
import { env } from "./config/env";

// errorHandler - Middleware global que captura errores y responde JSON.
import { errorHandler } from "./interfaces/middleware/errorHandler";

// --- Repositorios: Implementaciones Prisma de las interfaces del dominio ---
import { PrismaUserRepository } from "./infrastructure/repositories/PrismaUserRepository";
import { PrismaEssenceRepository } from "./infrastructure/repositories/PrismaEssenceRepository";
import { PrismaBottleRepository } from "./infrastructure/repositories/PrismaBottleRepository";
import { PrismaProductRepository } from "./infrastructure/repositories/PrismaProductRepository";
import { PrismaOrderRepository } from "./infrastructure/repositories/PrismaOrderRepository";
import { PrismaInventoryRepository } from "./infrastructure/repositories/PrismaInventoryRepository";
import { PrismaPaymentRepository } from "./infrastructure/repositories/PrismaPaymentRepository";
// PrismaAdminRepository - Consultas de reportes y metricas del negocio.
import { PrismaAdminRepository } from "./infrastructure/repositories/PrismaAdminRepository";
// PrismaEmailVerificationRepository - Tokens de verificacion de correo.
import { PrismaEmailVerificationRepository } from "./infrastructure/repositories/PrismaEmailVerificationRepository";
// PrismaPasswordResetRepository - Tokens de restablecimiento de contrasena.
import { PrismaPasswordResetRepository } from "./infrastructure/repositories/PrismaPasswordResetRepository";
// PrismaLoyaltyRepository - Cuentas y transacciones de fidelizacion.
import { PrismaLoyaltyRepository } from "./infrastructure/repositories/PrismaLoyaltyRepository";
// PrismaReferralRepository - Codigos y usos de referidos.
import { PrismaReferralRepository } from "./infrastructure/repositories/PrismaReferralRepository";
// PrismaOrderStatusHistoryRepository - Log inmutable de transiciones de estado de pedidos.
import { PrismaOrderStatusHistoryRepository } from "./infrastructure/repositories/PrismaOrderStatusHistoryRepository";
// PrismaInvoiceRepository - Facturas electronicas DIAN.
import { PrismaInvoiceRepository } from "./infrastructure/repositories/PrismaInvoiceRepository";
// PrismaGramRepository - Billetera y transacciones de gramos.
import { PrismaGramRepository } from "./infrastructure/repositories/PrismaGramRepository";
// PrismaGameTokenRepository - Fichas de juego (ruleta y puzzle).
import { PrismaGameTokenRepository } from "./infrastructure/repositories/PrismaGameTokenRepository";
// PrismaEssenceRedemptionRepository - Canjes de esencia.
import { PrismaEssenceRedemptionRepository } from "./infrastructure/repositories/PrismaEssenceRedemptionRepository";

// --- Servicios de aplicacion: logica de negocio reutilizable ---
// AuthService - Registro y login con JWT y bcrypt.
import { AuthService } from "./application/services/AuthService";
// InventoryService - Operaciones de inventario (stock, movimientos).
import { InventoryService } from "./application/services/InventoryService";
// AdminService - Reportes y metricas del panel administrativo.
import { AdminService } from "./application/services/AdminService";
// EmailService - Envio de correos electronicos (verificacion, reset, pedidos).
import { EmailService } from "./infrastructure/notifications/EmailService";
// LoyaltyService - Puntos, niveles y descuentos del programa de fidelizacion.
import { LoyaltyService } from "./application/services/LoyaltyService";
// ReferralService - Generacion y aplicacion de codigos de referido.
import { ReferralService } from "./application/services/ReferralService";
// InvoiceService - Ciclo de vida de facturas electronicas DIAN.
import { InvoiceService } from "./application/services/InvoiceService";
// ReportService - Genera reportes CSV y PDF descargables para el panel admin.
import { ReportService } from "./application/services/ReportService";
// GramService - Acumulacion y canje de gramos.
import { GramService } from "./application/services/GramService";
// GameTokenService - Fichas de juego (ruleta y puzzle).
import { GameTokenService } from "./application/services/GameTokenService";
// SimpleInvoiceService - Factura simple (no DIAN).
import { SimpleInvoiceService } from "./application/services/SimpleInvoiceService";
// SalesService - Ventas presenciales (POS).
import { SalesService } from "./application/services/SalesService";

// --- Casos de uso: orquestan la logica de negocio compleja ---
// CreateOrderUseCase - Crear orden con validacion de stock y descuentos.
import { CreateOrderUseCase } from "./application/usecases/CreateOrderUseCase";
// GenerateInvoiceUseCase - Factura electronica DIAN.
import { GenerateInvoiceUseCase } from "./application/usecases/GenerateInvoiceUseCase";
// EarnPointsAfterOrderUseCase - Acredita puntos de fidelizacion al entregar.
import { EarnPointsAfterOrderUseCase } from "./application/usecases/EarnPointsAfterOrderUseCase";

// --- Controladores: manejan HTTP y delegan a servicios/casos de uso ---
import { AuthController } from "./interfaces/controllers/AuthController";
import { UserController } from "./interfaces/controllers/UserController";
import { EssenceController } from "./interfaces/controllers/EssenceController";
import { BottleController } from "./interfaces/controllers/BottleController";
import { ProductController } from "./interfaces/controllers/ProductController";
import { OrderController } from "./interfaces/controllers/OrderController";
import { InventoryController } from "./interfaces/controllers/InventoryController";
import { PaymentController } from "./interfaces/controllers/PaymentController";
// AdminController - Dashboard y reportes de negocio.
import { AdminController } from "./interfaces/controllers/AdminController";
// GramController - Billetera de gramos del cliente y ajustes admin.
import { GramController } from "./interfaces/controllers/GramController";
// GameTokenController - Fichas de juego (consulta y jugar).
import { GameTokenController } from "./interfaces/controllers/GameTokenController";
// EssenceRedemptionController - Canjes de esencia (cliente y admin).
import { EssenceRedemptionController } from "./interfaces/controllers/EssenceRedemptionController";
// LoyaltyController - Puntos del programa de fidelizacion y referidos.
import { LoyaltyController } from "./interfaces/controllers/LoyaltyController";
// InvoiceController - Consulta y gestion de facturas electronicas.
import { InvoiceController } from "./interfaces/controllers/InvoiceController";
// POSController - Ventas presenciales.
import { POSController } from "./interfaces/controllers/POSController";
// FavoriteController - Favoritos de productos y esencias.
import { FavoriteController } from "./interfaces/controllers/FavoriteController";
// DianSoapClient - Gateway de facturacion (STUB hasta completar habilitacion DIAN).
import { DianSoapClient } from "./infrastructure/invoice/DianSoapClient";

// --- Fabricas de rutas: cada una recibe su controlador y retorna un Router ---
import { createAuthRoutes } from "./interfaces/routes/authRoutes";
import { createUserRoutes } from "./interfaces/routes/userRoutes";
import { createEssenceRoutes } from "./interfaces/routes/essenceRoutes";
import { createBottleRoutes } from "./interfaces/routes/bottleRoutes";
import { createProductRoutes } from "./interfaces/routes/productRoutes";
import { createOrderRoutes } from "./interfaces/routes/orderRoutes";
import { createInventoryRoutes } from "./interfaces/routes/inventoryRoutes";
import { createPaymentRoutes } from "./interfaces/routes/paymentRoutes";
// createAdminRoutes - Rutas de dashboard y reportes admin.
import { createAdminRoutes } from "./interfaces/routes/adminRoutes";
// createGramRoutes, createAdminGramRoutes - Billetera de gramos (cliente y admin).
import { createGramRoutes, createAdminGramRoutes } from "./interfaces/routes/gramRoutes";
// createGameTokenRoutes - Fichas de juego.
import { createGameTokenRoutes } from "./interfaces/routes/gameTokenRoutes";
// createRedemptionRoutes, createAdminRedemptionRoutes - Canjes de esencia.
import { createRedemptionRoutes, createAdminRedemptionRoutes } from "./interfaces/routes/redemptionRoutes";
// createAdminProductRoutes - CRUD admin de productos.
import { createAdminProductRoutes } from "./interfaces/routes/productRoutes";
// createChallengeRoutes - Desafios semanales (publico + cliente).
import { createChallengeRoutes } from "./interfaces/routes/challengeRoutes";
// createLoyaltyRoutes, createAdminLoyaltyRoutes - Fidelizacion y referidos.
import { createLoyaltyRoutes, createAdminLoyaltyRoutes } from "./interfaces/routes/loyaltyRoutes";
// createInvoiceRoutes, createAdminInvoiceRoutes - Facturas electronicas DIAN.
import { createInvoiceRoutes, createAdminInvoiceRoutes } from "./interfaces/routes/invoiceRoutes";
// createPOSRoutes - Ventas presenciales (POS).
import { createPOSRoutes } from "./interfaces/routes/posRoutes";
// createFavoriteRoutes - Favoritos de usuario.
import { createFavoriteRoutes } from "./interfaces/routes/favoriteRoutes";
// createUploadRoutes - Subida de imagenes con multer (admin).
import { createUploadRoutes } from "./interfaces/routes/uploadRoutes";
// createImageProxyRoutes - Proxy de imagenes externas (Google Drive, etc.).
import { createImageProxyRoutes } from "./interfaces/routes/imageProxyRoutes";

/**
 * Crea y configura la aplicacion Express completa.
 * Se exporta como funcion para permitir testing sin levantar servidor.
 * @returns Aplicacion Express lista para escuchar en un puerto.
 */
export function createApp(): express.Application {
  const app = express();

  // ---------------------------------------------------------------------------
  // Middlewares Globales
  // ---------------------------------------------------------------------------

  // Seguridad: headers HTTP seguros con configuracion CSP y HSTS
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          frameSrc: ["'self'"],
        },
      },
      hsts: env.nodeEnv === "production" ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      } : false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  // Generar requestId unico para trazabilidad de cada request en logs.
  app.use((req, _res, next) => {
    req.requestId = randomUUID();
    next();
  });

  // Logging de requests HTTP (ANTES de CORS/json para registrar todas las peticiones).
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

  // Proteccion contra HTTP Parameter Pollution (ej: ?status=PAID&status=CANCELLED).
  app.use(hpp());

  // CORS: permite requests desde el frontend (origen configurado en .env)
  app.use(
    cors({
      origin: env.cors.origin,
      credentials: true,
    })
  );

  // Parseo del body: JSON y formularios URL-encoded
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Servir archivos estaticos (imagenes subidas via /api/admin/upload)
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Rate limiting: protege /api de abuso (limite configurable en .env)
  const limiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, try again later" },
  });
  app.use("/api", limiter);

  // ---------------------------------------------------------------------------
  // Inyeccion de Dependencias (Composition Root)
  // ---------------------------------------------------------------------------

  // 1. Instanciar repositorios (acceso a datos via Prisma)
  const userRepo = new PrismaUserRepository();
  const essenceRepo = new PrismaEssenceRepository();
  const bottleRepo = new PrismaBottleRepository();
  const productRepo = new PrismaProductRepository();
  const orderRepo = new PrismaOrderRepository();
  const inventoryRepo = new PrismaInventoryRepository();
  const paymentRepo = new PrismaPaymentRepository();
  const adminRepo = new PrismaAdminRepository();
  const emailVerificationRepo = new PrismaEmailVerificationRepository();
  const passwordResetRepo = new PrismaPasswordResetRepository();
  const loyaltyRepo = new PrismaLoyaltyRepository();
  const referralRepo = new PrismaReferralRepository();
  const orderStatusHistoryRepo = new PrismaOrderStatusHistoryRepository();
  const invoiceRepo = new PrismaInvoiceRepository();
  const gramRepo = new PrismaGramRepository();
  const gameTokenRepo = new PrismaGameTokenRepository();
  const essenceRedemptionRepo = new PrismaEssenceRedemptionRepository();

  // EmailService - Implementacion concreta del contrato IEmailService.
  const emailService = new EmailService();

  // 2. Instanciar servicios (inyectando repositorios)
  const authService = new AuthService(
    userRepo,
    emailVerificationRepo,
    passwordResetRepo,
    emailService,
  );
  const inventoryService = new InventoryService(inventoryRepo);
  const adminService = new AdminService(adminRepo);
  const reportService = new ReportService();
  const loyaltyService = new LoyaltyService(loyaltyRepo, userRepo, emailService);
  const referralService = new ReferralService(referralRepo, loyaltyService, userRepo);
  const dianClient = new DianSoapClient();
  const invoiceService = new InvoiceService(invoiceRepo, orderRepo, dianClient, emailService);
  const gramService = new GramService(gramRepo, essenceRedemptionRepo, emailService);
  const gameTokenService = new GameTokenService(gameTokenRepo, gramService);
  const simpleInvoiceService = new SimpleInvoiceService(emailService, orderRepo);
  const salesService = new SalesService(
    orderRepo,
    productRepo,
    inventoryService,
    gameTokenService,
    simpleInvoiceService,
    emailService,
  );

  // 3. Instanciar casos de uso (inyectando repos y servicios)
  const createOrderUseCase = new CreateOrderUseCase(
    orderRepo,
    productRepo,
    paymentRepo,
    inventoryService,
    loyaltyService,
  );
  const generateInvoiceUseCase = new GenerateInvoiceUseCase(invoiceService);
  const earnPointsAfterOrderUseCase = new EarnPointsAfterOrderUseCase(
    loyaltyService,
    orderRepo,
    userRepo,
  );

  // 4. Instanciar controladores (inyectando servicios, casos de uso, repos)
  const authController = new AuthController(authService);
  const userController = new UserController(userRepo);
  const essenceController = new EssenceController(essenceRepo, inventoryService);
  const bottleController = new BottleController(bottleRepo, inventoryService);
  const productController = new ProductController(productRepo);
  const orderController = new OrderController(createOrderUseCase, orderRepo, earnPointsAfterOrderUseCase, orderStatusHistoryRepo, emailService, simpleInvoiceService, gameTokenService);
  const inventoryController = new InventoryController(inventoryService);
  const paymentController = new PaymentController(paymentRepo, orderRepo);
  const adminController = new AdminController(adminService, reportService);
  const gramController = new GramController(gramService, gramRepo, essenceRedemptionRepo);
  const gameTokenController = new GameTokenController(gameTokenService, gameTokenRepo);
  const essenceRedemptionController = new EssenceRedemptionController(essenceRedemptionRepo, gramService);
  const loyaltyController = new LoyaltyController(loyaltyService, referralService);
  const invoiceController = new InvoiceController(invoiceService, invoiceRepo, orderRepo);
  const posController = new POSController(salesService, orderRepo);
  const favoriteController = new FavoriteController();

  // ---------------------------------------------------------------------------
  // Rutas de la API
  // ---------------------------------------------------------------------------

  // Health check: verifica que la API este activa
  app.get("/api/health", (_req, res) => {
    res.json({ success: true, message: "Variedades Danni API is running" });
  });

  // Montar cada modulo de rutas en su prefijo
  app.use("/api/auth", createAuthRoutes(authController));
  app.use("/api/users", createUserRoutes(userController));
  app.use("/api/essences", createEssenceRoutes(essenceController));
  app.use("/api/bottles", createBottleRoutes(bottleController));
  app.use("/api/products", createProductRoutes(productController));
  app.use("/api/orders", createOrderRoutes(orderController));
  app.use("/api/inventory", createInventoryRoutes(inventoryController));
  app.use("/api/payments", createPaymentRoutes(paymentController));
  app.use("/api/admin", createAdminRoutes(adminController));
  app.use("/api/admin/products", createAdminProductRoutes(productController));
  app.use("/api/admin/grams", createAdminGramRoutes(gramController));
  app.use("/api/admin/redemptions", createAdminRedemptionRoutes(essenceRedemptionController));
  app.use("/api/grams", createGramRoutes(gramController));
  app.use("/api/game-tokens", createGameTokenRoutes(gameTokenController));
  app.use("/api/redemptions", createRedemptionRoutes(essenceRedemptionController));
  app.use("/api/challenges", createChallengeRoutes(adminController));
  app.use("/api/loyalty", createLoyaltyRoutes(loyaltyController));
  app.use("/api/admin/loyalty", createAdminLoyaltyRoutes(loyaltyController));
  app.use("/api/invoices", createInvoiceRoutes(invoiceController));
  app.use("/api/admin/invoices", createAdminInvoiceRoutes(invoiceController));
  app.use("/api/admin/upload", createUploadRoutes());
  app.use("/api/pos", createPOSRoutes(posController));
  app.use("/api/favorites", createFavoriteRoutes(favoriteController));
  app.use("/api/images", createImageProxyRoutes());

  // ---------------------------------------------------------------------------
  // Cron: expirar fichas de juego viejas cada 6 horas
  // ---------------------------------------------------------------------------
  gameTokenService.expireOldTokens().catch(() => {});
  setInterval(() => {
    gameTokenService.expireOldTokens().catch(() => {});
  }, 6 * 60 * 60 * 1000);

  // ---------------------------------------------------------------------------
  // Error Handler (debe ir al final de la cadena de middlewares)
  // ---------------------------------------------------------------------------
  app.use(errorHandler);

  return app;
}
