/**
 * Punto de entrada de la aplicacion Variedades Danni.
 * Conecta a PostgreSQL via Prisma, levanta el servidor HTTP
 * y configura graceful shutdown para SIGINT/SIGTERM.
 */

// createApp - Funcion que construye y configura la app Express.
import { createApp } from "./app";

// env - Variables de entorno (puerto, modo).
import { env } from "./config/env";

// logger - Winston logger para registrar eventos del servidor.
import logger from "./utils/logger";

// prisma - Cliente Prisma para conectar/desconectar de PostgreSQL.
import prisma from "./config/database";

// seedAdminUser - Crea el usuario admin por defecto si no existe.
// seedCatalogData - Crea familias olfativas y casas de fragancias por defecto.
import { seedAdminUser, seedCatalogData } from "./config/seed";

// Crear la instancia de la aplicacion Express
const app = createApp();

/**
 * Funcion principal asincrona.
 * Conecta a la base de datos y arranca el servidor HTTP.
 */
async function main(): Promise<void> {
  try {
    // Conectar a PostgreSQL
    await prisma.$connect();
    logger.info("Database connected successfully");

    // Crear usuario administrador por defecto si no existe
    await seedAdminUser();

    // Crear familias olfativas y casas de fragancias por defecto
    await seedCatalogData();

    // Iniciar servidor HTTP en el puerto configurado
    app.listen(env.port, () => {
      logger.info(
        `Server running on port ${env.port} in ${env.nodeEnv} mode`
      );
      logger.info(`Health check: http://localhost:${env.port}/api/health`);
    });
  } catch (error) {
    // Si falla la conexion o el inicio, terminar el proceso
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// --- Graceful Shutdown ---
// Al recibir SIGINT (Ctrl+C) o SIGTERM (Docker stop), desconectar Prisma
process.on("SIGINT", async () => {
  logger.info("SIGINT received. Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});

// --- Manejo de errores no capturados ---
// Promesas rechazadas sin catch
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
});

// Excepciones no capturadas: loguear y terminar
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Ejecutar la funcion principal
main();
