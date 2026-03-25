/**
 * Seed de usuario administrador por defecto.
 * Se ejecuta al iniciar el servidor. Si el admin ya existe, no hace nada.
 */

import bcrypt from "bcrypt";
import prisma from "./database";
import { env } from "./env";
import logger from "../utils/logger";

const ADMIN_EMAIL    = env.admin.email;
const ADMIN_PASSWORD = env.admin.password;
const ADMIN_NAME     = env.admin.name;
const ADMIN_PHONE    = env.admin.phone;

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
        emailVerified: true,
      },
    });

    logger.info(`Admin user created successfully: ${ADMIN_EMAIL}`);
  } catch (error) {
    logger.error("Failed to seed admin user:", error);
  }
}
