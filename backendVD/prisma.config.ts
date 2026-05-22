/**
 * Configuracion de Prisma 7 CLI (generate, migrate, studio, db push).
 *
 * La URL de la base de datos se lee de DATABASE_URL via el helper env(),
 * que lanza error en runtime si la variable no esta definida.
 *
 * El path del schema es relativo al directorio de este archivo de config.
 */

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

