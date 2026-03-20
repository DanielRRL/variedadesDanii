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
} as const;
