/**
 * Configuracion del sistema de logging con Winston.
 * - Desarrollo: nivel debug, consola con colores.
 * - Produccion: nivel info, archivos con rotacion diaria (14 dias).
 * Todos los servicios y controllers importan este logger para
 * registro centralizado de la actividad del sistema.
 */

// winston - Libreria de logging configurable con multiples transportes.
import winston from "winston";

// Daily Rotate File - Rotacion automatica de archivos de log.
import DailyRotateFile from "winston-daily-rotate-file";

// env - Se usa nodeEnv para decidir el nivel de logging.
import { env } from "../config/env";

const logDir = "logs";

/**
 * Instancia global del logger.
 * - En desarrollo: nivel debug, muestra todo en consola con colores.
 * - En produccion: nivel info, archivos con rotacion diaria + consola.
 */
const logger = winston.createLogger({
  level: env.nodeEnv === "development" ? "debug" : "info",

  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),

  defaultMeta: { service: "variedades-danni" },

  transports: [
    // Archivo con rotacion diaria solo para errores (14 dias de retencion).
    new DailyRotateFile({
      filename: `${logDir}/error-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxFiles: "14d",
      maxSize: "20m",
    }),
    // Archivo con rotacion diaria para todos los niveles (14 dias).
    new DailyRotateFile({
      filename: `${logDir}/combined-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      maxSize: "20m",
    }),
  ],
});

// En desarrollo y en Docker/containerizados: salida a consola.
if (env.nodeEnv === "development" || env.nodeEnv !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export default logger;

/**
 * Enmascara un email para logs: "juan@gmail.com" → "j***@g***.com".
 * Seguro para GDPR/compliance — no expone datos personales en logs.
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  const domainParts = domain.split(".");
  const tld = domainParts.pop();
  const maskedDomain = domainParts.length > 0
    ? domainParts[0][0] + "***"
    : domain[0] + "***";
  return `${local[0]}***@${maskedDomain}.${tld}`;
}
