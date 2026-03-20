/**
 * Configuracion del sistema de logging con Winston.
 * Registra eventos en archivos y en consola durante desarrollo.
 * Todos los servicios y controllers importan este logger
 * para tener un registro centralizado de la actividad del sistema.
 */

// winston - Libreria de logging configurable con multiples transportes
// (archivo, consola, servicios externos). Soporta niveles (error, warn, info, debug).
import winston from "winston";

// env - Se usa nodeEnv para decidir el nivel de logging
// y si se activa la salida por consola.
import { env } from "../config/env";

/**
 * Instancia global del logger.
 * - En desarrollo: nivel debug, muestra todo en consola con colores.
 * - En produccion: nivel info, solo escribe en archivos.
 */
const logger = winston.createLogger({
  // Nivel minimo de logs a capturar.
  level: env.nodeEnv === "development" ? "debug" : "info",

  // Formato de salida: timestamp legible + stack traces + JSON estructurado.
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),

  // Metadato que se incluye en cada log para identificar el servicio.
  defaultMeta: { service: "variedades-danni" },

  // Transportes: donde se escriben los logs.
  transports: [
    // Archivo exclusivo para errores.
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    // Archivo general con todos los niveles.
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

// En desarrollo se agrega la consola como transporte adicional
// con colores para facilitar la lectura durante la depuracion.
if (env.nodeEnv === "development") {
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
