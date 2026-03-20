/**
 * Seed de usuario administrador por defecto.
 * Se ejecuta al iniciar el servidor. Si el admin ya existe, no hace nada.
 */

import bcrypt from "bcrypt";
import prisma from "./database";
import logger from "../utils/logger";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "danielramon379@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Drrl2468#";
const ADMIN_NAME = process.env.ADMIN_NAME || "Administrador";
const ADMIN_PHONE = process.env.ADMIN_PHONE || "+573232943624";

/**
 * Crea el usuario administrador si no existe en la base de datos.
 * Usa upsert para evitar duplicados de forma segura.
 */
export async function seedAdminUser(): Promise<void> {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (existing) {
      logger.info(`Admin user already exists: ${ADMIN_EMAIL}`);
      return;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await prisma.user.create({
      data: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        phone: ADMIN_PHONE,
        password: hashedPassword,
        role: "ADMIN",
        active: true,
      },
    });

    logger.info(`Admin user created successfully: ${ADMIN_EMAIL}`);
  } catch (error) {
    logger.error("Failed to seed admin user:", error);
  }
}
