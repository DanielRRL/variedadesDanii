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

// ---------------------------------------------------------------------------
// Seed: Olfactive Families (notas olfativas)
// ---------------------------------------------------------------------------

const OLFACTIVE_FAMILIES = [
  "Amaderada",
  "Cítrica",
  "Dulce",
  "Floral",
  "Frutal",
  "Oriental",
  "Especiada",
  "Acuática",
  "Aromática",
  "Fresca",
  "Chipre",
  "Fougère",
  "Gourmand",
  "Almizclada",
  "Ámbar",
  "Cuero",
  "Herbácea",
  "Ozónica",
  "Terrosa",
  "Balsámica",
  "Ahumada",
  "Resinosa",
  "Vetiver",
  "Lavanda",
  "Verde",
  "Talco",
  "Marina",
  "Tropical",
];

// ---------------------------------------------------------------------------
// Seed: Fragrance Houses (casas de fragancias)
// ---------------------------------------------------------------------------

const FRAGRANCE_HOUSES: { name: string; handle: string }[] = [
  { name: "Carolina Herrera", handle: "carolinaherrera" },
  { name: "Versace", handle: "versace" },
  { name: "Dior", handle: "dior" },
  { name: "Chanel", handle: "chanel" },
  { name: "Tom Ford", handle: "tomford" },
  { name: "Yves Saint Laurent", handle: "ysl" },
  { name: "Giorgio Armani", handle: "armani" },
  { name: "Dolce & Gabbana", handle: "dolcegabbana" },
  { name: "Paco Rabanne", handle: "pacorabanne" },
  { name: "Jean Paul Gaultier", handle: "jpgaultier" },
  { name: "Hugo Boss", handle: "hugoboss" },
  { name: "Calvin Klein", handle: "calvinklein" },
  { name: "Gucci", handle: "gucci" },
  { name: "Givenchy", handle: "givenchy" },
  { name: "Lancôme", handle: "lancome" },
  { name: "Burberry", handle: "burberry" },
  { name: "Ralph Lauren", handle: "ralphlauren" },
  { name: "Hermès", handle: "hermes" },
  { name: "Valentino", handle: "valentino" },
  { name: "Bvlgari", handle: "bvlgari" },
  { name: "Montblanc", handle: "montblanc" },
  { name: "Issey Miyake", handle: "isseymiyake" },
  { name: "Azzaro", handle: "azzaro" },
  { name: "Narciso Rodriguez", handle: "narcisorodriguez" },
  { name: "Lacoste", handle: "lacoste" },
  { name: "Creed", handle: "creed" },
  { name: "Maison Margiela", handle: "maisonmargiela" },
  { name: "Jo Malone", handle: "jomalone" },
  { name: "Thierry Mugler", handle: "thierrymugler" },
  { name: "Kenzo", handle: "kenzo" },
  { name: "Marc Jacobs", handle: "marcjacobs" },
  { name: "Loewe", handle: "loewe" },
  { name: "Prada", handle: "prada" },
  { name: "Mancera", handle: "mancera" },
  { name: "Lattafa", handle: "lattafa" },
  { name: "Afnan", handle: "afnan" },
  { name: "Al Haramain", handle: "alharamain" },
  { name: "Natura", handle: "natura" },
  { name: "Esika", handle: "esika" },
  { name: "Yanbal", handle: "yanbal" },
];

/**
 * Seed olfactive families and fragrance houses.
 * Uses upsert to avoid duplicates on repeated runs.
 */
export async function seedCatalogData(): Promise<void> {
  try {
    // Seed olfactive families
    for (const name of OLFACTIVE_FAMILIES) {
      await prisma.olfactiveFamily.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    logger.info(`Seeded ${OLFACTIVE_FAMILIES.length} olfactive families`);

    // Seed fragrance houses
    for (const house of FRAGRANCE_HOUSES) {
      await prisma.house.upsert({
        where: { handle: house.handle },
        update: {},
        create: { name: house.name, handle: house.handle },
      });
    }
    logger.info(`Seeded ${FRAGRANCE_HOUSES.length} fragrance houses`);
  } catch (error) {
    logger.error("Failed to seed catalog data:", error);
  }
}
