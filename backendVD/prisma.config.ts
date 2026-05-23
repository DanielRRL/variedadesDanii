/**
 * Configuracion de Prisma 7 CLI (generate, migrate, studio, db push).
 *
 * La URL de la base de datos se lee de DATABASE_URL via process.env.
 * Se usa process.env (no el helper env()) porque prisma generate durante
 * el build de Docker no tiene DATABASE_URL disponible — generate solo
 * necesita el schema, no una conexion real.
 *
 * En runtime (Docker Compose / produccion), DATABASE_URL siempre esta
 * definida. El path del schema es relativo al directorio de este archivo.
 */

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});

