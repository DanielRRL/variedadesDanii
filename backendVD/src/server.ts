import { createApp } from "./app";
import { env } from "./config/env";
import logger from "./utils/logger";
import prisma from "./config/database";
import { seedAdminUser, seedCatalogData } from "./config/seed";

const app = createApp();

async function main(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");

    await seedAdminUser();
    await seedCatalogData();

    const server = app.listen(env.port, () => {
      logger.info(
        `Server running on port ${env.port} in ${env.nodeEnv} mode`
      );
      logger.info(`Health check: http://localhost:${env.port}/api/health`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Gracefully shutting down...`);
      server.close(() => {
        logger.info("HTTP server closed");
      });
      await prisma.$disconnect();
      logger.info("Database disconnected");
      process.exit(0);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", async (error) => {
  logger.error("Uncaught Exception:", error);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});

main();
