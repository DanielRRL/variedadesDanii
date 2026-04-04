/**
 * Configuracion de variables de entorno con validacion Zod.
 * Carga las variables desde el archivo .env usando dotenv y las valida
 * con un schema Zod al arrancar. Si faltan variables criticas el proceso
 * termina con un mensaje claro indicando que falta.
 */

import dotenv from "dotenv";
import { z } from "zod";

// Cargar .env antes de validar
dotenv.config();

// Helpers para transformar strings de env a numeros con defaults
const numericString = (fallback: number) =>
  z.string().optional().transform((v) => parseInt(v || String(fallback), 10));

// Schema de validacion: las vars criticas (DATABASE_URL, JWT_SECRET) son requeridas.
// Las opcionales tienen defaults seguros para desarrollo local.
const envSchema = z.object({
  PORT: numericString(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET es obligatoria"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: numericString(900000),
  RATE_LIMIT_MAX: numericString(100),

  // Wompi (pasarela de pagos) — opcionales en desarrollo
  WOMPI_API_URL: z.string().default("https://sandbox.wompi.co/v1"),
  WOMPI_PUBLIC_KEY: z.string().default(""),
  WOMPI_PRIVATE_KEY: z.string().default(""),
  WOMPI_EVENTS_SECRET: z.string().default(""),
  WOMPI_CURRENCY: z.string().default("COP"),
  WOMPI_REDIRECT_URL: z.string().default("http://localhost:5173/payment-result"),

  // DIAN (facturacion electronica) — opcionales
  DIAN_ENV: z.string().default("test"),
  DIAN_API_URL: z.string().default("https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc"),
  DIAN_NIT: z.string().default(""),
  DIAN_NIT_CHECK_DIGIT: z.string().default("0"),
  DIAN_COMPANY_NAME: z.string().default("Variedades Danni"),
  DIAN_EMAIL: z.string().default("facturas@variedadesdanni.co"),
  DIAN_PHONE: z.string().default(""),
  DIAN_ADDRESS: z.string().default(""),
  DIAN_CITY_CODE: z.string().default("63001"),
  DIAN_CITY_NAME: z.string().default("Armenia"),
  DIAN_DEPARTMENT_CODE: z.string().default("63"),
  DIAN_DEPARTMENT_NAME: z.string().default("Quindio"),
  DIAN_TAX_REGIME: z.string().default("48"),
  DIAN_SOFTWARE_ID: z.string().default(""),
  DIAN_SOFTWARE_PIN: z.string().default(""),
  DIAN_CERT_PATH: z.string().default("./certs/certificado.pfx"),
  DIAN_CERT_PASSWORD: z.string().default(""),

  // Datos de negocio para factura simple
  BUSINESS_NIT: z.string().default(""),

  // Email (SMTP) — opcionales, el servicio maneja la ausencia gracefully
  EMAIL_HOST: z.string().default("smtp-relay.brevo.com"),
  EMAIL_PORT: numericString(587),
  EMAIL_USER: z.string().default(""),
  EMAIL_PASS: z.string().default(""),
  EMAIL_FROM: z.string().default("no-reply@variedadesdanii.com"),
  EMAIL_FROM_NAME: z.string().default("Variedades DANII Perfumeria"),

  // Admin seed
  ADMIN_EMAIL: z.string().default("admin@variedadesdanii.com"),
  ADMIN_PASSWORD: z.string().default("Admin1234#"),
  ADMIN_NAME: z.string().default("Administrador"),
  ADMIN_PHONE: z.string().default("+573000000000"),
});

// Validar y parsear al arrancar. Si falla, loguear errores y detener el proceso.
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables de entorno invalidas:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const v = parsed.data;

/**
 * Objeto inmutable con todas las variables de entorno validadas.
 * Cada modulo importa este objeto en vez de leer process.env directamente.
 */
export const env = {
  port: v.PORT,
  nodeEnv: v.NODE_ENV,
  databaseUrl: v.DATABASE_URL,
  frontendUrl: v.FRONTEND_URL,

  jwt: {
    secret: v.JWT_SECRET,
    expiresIn: v.JWT_EXPIRES_IN,
  },

  cors: {
    origin: v.CORS_ORIGIN,
  },

  rateLimit: {
    windowMs: v.RATE_LIMIT_WINDOW_MS,
    max: v.RATE_LIMIT_MAX,
  },

  wompi: {
    apiUrl: v.WOMPI_API_URL,
    publicKey: v.WOMPI_PUBLIC_KEY,
    privateKey: v.WOMPI_PRIVATE_KEY,
    eventsSecret: v.WOMPI_EVENTS_SECRET,
    currency: v.WOMPI_CURRENCY,
    redirectUrl: v.WOMPI_REDIRECT_URL,
  },

  dian: {
    env: v.DIAN_ENV,
    apiUrl: v.DIAN_API_URL,
    nit: v.DIAN_NIT,
    nitCheckDigit: v.DIAN_NIT_CHECK_DIGIT,
    companyName: v.DIAN_COMPANY_NAME,
    email: v.DIAN_EMAIL,
    phone: v.DIAN_PHONE,
    address: v.DIAN_ADDRESS,
    cityCode: v.DIAN_CITY_CODE,
    cityName: v.DIAN_CITY_NAME,
    departmentCode: v.DIAN_DEPARTMENT_CODE,
    departmentName: v.DIAN_DEPARTMENT_NAME,
    taxRegime: v.DIAN_TAX_REGIME,
    softwareId: v.DIAN_SOFTWARE_ID,
    softwarePin: v.DIAN_SOFTWARE_PIN,
    certPath: v.DIAN_CERT_PATH,
    certPassword: v.DIAN_CERT_PASSWORD,
  },

  email: {
    host: v.EMAIL_HOST,
    port: v.EMAIL_PORT,
    user: v.EMAIL_USER,
    pass: v.EMAIL_PASS,
    from: v.EMAIL_FROM,
    fromName: v.EMAIL_FROM_NAME,
  },

  business: {
    nit: v.BUSINESS_NIT,
  },

  admin: {
    email: v.ADMIN_EMAIL,
    password: v.ADMIN_PASSWORD,
    name: v.ADMIN_NAME,
    phone: v.ADMIN_PHONE,
  },
} as const;
