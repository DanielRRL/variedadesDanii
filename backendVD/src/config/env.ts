/**
 * Configuracion de variables de entorno.
 * Carga las variables desde el archivo .env usando dotenv y las expone
 * de forma tipada para que el resto de la aplicacion las consuma
 * sin acceder directamente a process.env.
 */

// dotenv - Lee el archivo .env de la raiz del proyecto y carga
// las variables en process.env para que esten disponibles en runtime.
import dotenv from "dotenv";

// Ejecuta la carga del .env antes de exportar las variables.
dotenv.config();

/**
 * Objeto inmutable con todas las variables de entorno de la aplicacion.
 * Usa "as const" para que TypeScript infiera los tipos literales
 * y evite mutaciones accidentales.
 */
export const env = {
  // Puerto donde escucha el servidor Express.
  port: parseInt(process.env.PORT || "4000", 10),

  // Entorno de ejecucion: development | production | test.
  nodeEnv: process.env.NODE_ENV || "development",

  // URL de conexion a PostgreSQL usada por Prisma.
  databaseUrl: process.env.DATABASE_URL || "",

  // Configuracion de JSON Web Token para autenticacion.
  jwt: {
    // Clave secreta para firmar y verificar tokens.
    secret: process.env.JWT_SECRET || "",
    // Tiempo de expiracion del token (ej: "7d" = 7 dias).
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  // Configuracion de CORS (Cross-Origin Resource Sharing).
  cors: {
    // Origen permitido para peticiones del frontend.
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },

  // Configuracion del rate limiter para proteger contra abuso.
  rateLimit: {
    // Ventana de tiempo en milisegundos (15 minutos por defecto).
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    // Maximo de peticiones permitidas por ventana.
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  },

  // Configuracion de Wompi: pasarela de pagos colombiana.
  // Las claves de sandbox tienen el prefijo "test_"; en produccion usar sin ese prefijo.
  wompi: {
    // URL base de la API Wompi (sandbox o produccion segun NODE_ENV).
    apiUrl: process.env.WOMPI_API_URL || "https://sandbox.wompi.co/v1",
    // Clave publica (safe para el frontend; identifica el comercio).
    publicKey: process.env.WOMPI_PUBLIC_KEY || "",
    // Clave privada (SOLO el servidor; autoriza transacciones y consultas).
    privateKey: process.env.WOMPI_PRIVATE_KEY || "",
    // Secreto de eventos: usado para validar la firma HMAC-SHA256 de los webhooks.
    eventsSecret: process.env.WOMPI_EVENTS_SECRET || "",
    // Moneda de las transacciones (COP para Colombia).
    currency: process.env.WOMPI_CURRENCY || "COP",
    // URL de redireccion post-pago para el cliente.
    redirectUrl: process.env.WOMPI_REDIRECT_URL || "http://localhost:5173/payment-result",
  },

  // Configuracion de la DIAN: facturacion electronica Colombia.
  // Valores solo necesarios cuando se reemplace el STUB (ver docs/DIAN_INTEGRATION.md).
  dian: {
    // Ambiente: "test" = habilitador DIAN, "production" = produccion.
    env: process.env.DIAN_ENV || "test",
    // URL del servicio SOAP de la DIAN.
    apiUrl: process.env.DIAN_API_URL || "https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc",
    // NIT del emisor (sin digito de verificacion).
    nit: process.env.DIAN_NIT || "",
    // Digito de verificacion del NIT.
    nitCheckDigit: process.env.DIAN_NIT_CHECK_DIGIT || "0",
    // Razon social del emisor.
    companyName: process.env.DIAN_COMPANY_NAME || "Variedades Danni",
    // Correo de facturacion del emisor.
    email: process.env.DIAN_EMAIL || "facturas@variedadesdanni.co",
    // Telefono del emisor.
    phone: process.env.DIAN_PHONE || "",
    // Direccion fisica del emisor.
    address: process.env.DIAN_ADDRESS || "",
    // Codigo DANE del municipio (Armenia, Quindio = 63001).
    cityCode: process.env.DIAN_CITY_CODE || "63001",
    // Nombre del municipio.
    cityName: process.env.DIAN_CITY_NAME || "Armenia",
    // Codigo DANE del departamento (Quindio = 63).
    departmentCode: process.env.DIAN_DEPARTMENT_CODE || "63",
    // Nombre del departamento.
    departmentName: process.env.DIAN_DEPARTMENT_NAME || "Quindio",
    // Regimen tributario ("48" = No responsable de IVA).
    taxRegime: process.env.DIAN_TAX_REGIME || "48",
    // ID del software registrado en Muisca.
    softwareId: process.env.DIAN_SOFTWARE_ID || "",
    // PIN del software registrado en Muisca.
    softwarePin: process.env.DIAN_SOFTWARE_PIN || "",
    // Ruta al certificado digital .PFX.
    certPath: process.env.DIAN_CERT_PATH || "./certs/certificado.pfx",
    // Contrasena del certificado .PFX.
    certPassword: process.env.DIAN_CERT_PASSWORD || "",
  },
} as const;
