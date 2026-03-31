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
 * Crea o actualiza el usuario administrador.
 * Usa upsert: si ya existe, garantiza que tenga role=ADMIN, active=true,
 * emailVerified=true y la contraseña correcta. Si no existe, lo crea.
 */
export async function seedAdminUser(): Promise<void> {
  try {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        name: ADMIN_NAME,
        phone: ADMIN_PHONE,
        password: hashedPassword,
        role: "ADMIN",
        active: true,
        emailVerified: true,
      },
      create: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        phone: ADMIN_PHONE,
        password: hashedPassword,
        role: "ADMIN",
        active: true,
        emailVerified: true,
      },
    });

    logger.info(`Admin user ready: ${admin.email} (${admin.id})`);
  } catch (error) {
    logger.error("Failed to seed admin user:", error);
  }
}
