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

// cors - Middleware que habilita Cross-Origin Resource Sharing para el frontend.
import cors from "cors";

// helmet - Middleware de seguridad que configura headers HTTP seguros.
import helmet from "helmet";

// morgan - Logger de requests HTTP (formato dev o combined segun entorno).
import morgan from "morgan";

// rateLimit - Limita la cantidad de requests por ventana de tiempo.
import rateLimit from "express-rate-limit";

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
import { PrismaBottleReturnRepository } from "./infrastructure/repositories/PrismaBottleReturnRepository";
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

// --- Servicios de aplicacion: logica de negocio reutilizable ---
// AuthService - Registro y login con JWT y bcrypt.
import { AuthService } from "./application/services/AuthService";
// InventoryService - Operaciones de inventario (stock, movimientos).
import { InventoryService } from "./application/services/InventoryService";
// DiscountService - Calculo de descuentos por devolucion de frascos.
import { DiscountService } from "./application/services/DiscountService";
// AdminService - Reportes y metricas del panel administrativo.
import { AdminService } from "./application/services/AdminService";
// EmailService - Envio de correos electronicos (verificacion, reset, pedidos).
import { EmailService } from "./infrastructure/notifications/EmailService";
// LoyaltyService - Puntos, niveles y descuentos del programa de fidelizacion.
import { LoyaltyService } from "./application/services/LoyaltyService";
// ReferralService - Generacion y aplicacion de codigos de referido.
import { ReferralService } from "./application/services/ReferralService";

// --- Casos de uso: orquestan la logica de negocio compleja ---
// CreateOrderUseCase - Crear orden con validacion de stock y descuentos.
import { CreateOrderUseCase } from "./application/usecases/CreateOrderUseCase";
// ProcessBottleReturnUseCase - Procesar devolucion de frasco.
import { ProcessBottleReturnUseCase } from "./application/usecases/ProcessBottleReturnUseCase";
// EarnPointsAfterOrderUseCase - Acreditar puntos al entregar una orden.
import { EarnPointsAfterOrderUseCase } from "./application/usecases/EarnPointsAfterOrderUseCase";

// --- Controladores: manejan HTTP y delegan a servicios/casos de uso ---
import { AuthController } from "./interfaces/controllers/AuthController";
import { UserController } from "./interfaces/controllers/UserController";
import { EssenceController } from "./interfaces/controllers/EssenceController";
import { BottleController } from "./interfaces/controllers/BottleController";
import { ProductController } from "./interfaces/controllers/ProductController";
import { OrderController } from "./interfaces/controllers/OrderController";
import { InventoryController } from "./interfaces/controllers/InventoryController";
import { BottleReturnController } from "./interfaces/controllers/BottleReturnController";
import { PaymentController } from "./interfaces/controllers/PaymentController";
// AdminController - Dashboard y reportes de negocio.
import { AdminController } from "./interfaces/controllers/AdminController";
// LoyaltyController - Puntos del programa de fidelizacion y referidos.
import { LoyaltyController } from "./interfaces/controllers/LoyaltyController";

// --- Fabricas de rutas: cada una recibe su controlador y retorna un Router ---
import { createAuthRoutes } from "./interfaces/routes/authRoutes";
import { createUserRoutes } from "./interfaces/routes/userRoutes";
import { createEssenceRoutes } from "./interfaces/routes/essenceRoutes";
import { createBottleRoutes } from "./interfaces/routes/bottleRoutes";
import { createProductRoutes } from "./interfaces/routes/productRoutes";
import { createOrderRoutes } from "./interfaces/routes/orderRoutes";
import { createInventoryRoutes } from "./interfaces/routes/inventoryRoutes";
import { createBottleReturnRoutes } from "./interfaces/routes/bottleReturnRoutes";
import { createPaymentRoutes } from "./interfaces/routes/paymentRoutes";
// createAdminRoutes - Rutas de dashboard y reportes admin.
import { createAdminRoutes } from "./interfaces/routes/adminRoutes";
// createLoyaltyRoutes, createAdminLoyaltyRoutes - Fidelizacion y referidos.
import { createLoyaltyRoutes, createAdminLoyaltyRoutes } from "./interfaces/routes/loyaltyRoutes";

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

  // Seguridad: headers HTTP seguros (X-Content-Type-Options, etc)
  app.use(helmet());

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

  // Logging de requests HTTP (dev en desarrollo, combined en produccion)
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));

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
  const bottleReturnRepo = new PrismaBottleReturnRepository();
  const adminRepo = new PrismaAdminRepository();
  const emailVerificationRepo = new PrismaEmailVerificationRepository();
  const passwordResetRepo = new PrismaPasswordResetRepository();
  const loyaltyRepo = new PrismaLoyaltyRepository();
  const referralRepo = new PrismaReferralRepository();
  const orderStatusHistoryRepo = new PrismaOrderStatusHistoryRepository();

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
  const discountService = new DiscountService(userRepo, bottleReturnRepo);
  const adminService = new AdminService(adminRepo);
  const loyaltyService = new LoyaltyService(loyaltyRepo, userRepo, emailService);
  const referralService = new ReferralService(referralRepo, loyaltyService, userRepo);

  // 3. Instanciar casos de uso (inyectando repos y servicios)
  const createOrderUseCase = new CreateOrderUseCase(
    orderRepo,
    productRepo,
    paymentRepo,
    inventoryService,
    discountService,
    loyaltyService,
  );
  const processBottleReturnUseCase = new ProcessBottleReturnUseCase(
    bottleReturnRepo,
    bottleRepo,
    inventoryService
  );
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
  const orderController = new OrderController(createOrderUseCase, orderRepo, earnPointsAfterOrderUseCase, orderStatusHistoryRepo, emailService);
  const inventoryController = new InventoryController(inventoryService);
  const bottleReturnController = new BottleReturnController(
    processBottleReturnUseCase,
    bottleReturnRepo
  );
  const paymentController = new PaymentController(paymentRepo, orderRepo);
  const adminController = new AdminController(adminService);
  const loyaltyController = new LoyaltyController(loyaltyService, referralService);

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
  app.use("/api/returns", createBottleReturnRoutes(bottleReturnController));
  app.use("/api/payments", createPaymentRoutes(paymentController));
  app.use("/api/admin", createAdminRoutes(adminController));
  app.use("/api/loyalty", createLoyaltyRoutes(loyaltyController));
  app.use("/api/admin/loyalty", createAdminLoyaltyRoutes(loyaltyController));

  // ---------------------------------------------------------------------------
  // Error Handler (debe ir al final de la cadena de middlewares)
  // ---------------------------------------------------------------------------
  app.use(errorHandler);

  return app;
}
