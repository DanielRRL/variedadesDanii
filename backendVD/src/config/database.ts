/**
 * Configuracion de la conexion a base de datos con Prisma.
 * Crea una unica instancia de PrismaClient (patron Singleton)
 * para reutilizar la conexion en toda la aplicacion y evitar
 * multiples pools de conexiones.
 */

// PrismaClient - ORM que genera un cliente tipado a partir del schema.prisma.
// Administra la conexion a PostgreSQL y ejecuta las consultas.
import { PrismaClient } from "@prisma/client";

// PrismaPg - Adapter oficial de Prisma para PostgreSQL usando el driver "pg".
// Prisma 7.x con engine type "client" requiere un adapter o accelerateUrl.
import { PrismaPg } from "@prisma/adapter-pg";

// env - Variables de entorno tipadas, se usa nodeEnv para decidir
// el nivel de logging de Prisma y obtener la URL de la base de datos.
import { env } from "./env";

/**
 * Adapter de PostgreSQL para Prisma 7.x.
 * Usa el driver "pg" (ya incluido como dependencia del proyecto)
 * y recibe la URL de conexion desde las variables de entorno.
 */
const adapter = new PrismaPg({ connectionString: env.databaseUrl });

/**
 * Instancia unica de PrismaClient.
 * En desarrollo muestra queries, errores y advertencias en consola.
 * En produccion solo muestra errores para reducir ruido en los logs.
 * El adapter conecta Prisma al driver pg nativo en lugar del motor binario.
 */
const prisma = new PrismaClient({
  adapter,
  log: env.nodeEnv === "development" ? ["query", "error", "warn"] : ["error"],
} as any);

export default prisma;
