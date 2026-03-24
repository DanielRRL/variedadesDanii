/**
 * Configuracion global de tests (Vitest setupFiles).
 *
 * Este archivo se ejecuta automaticamente ANTES de cada suite de tests
 * gracias a la opcion setupFiles en vitest.config.ts.
 *
 * Responsabilidades:
 *   1. Establecer variables de entorno necesarias para que el codigo
 *      de produccion no falle al importarse (JWT_SECRET, DATABASE_URL, etc.)
 *   2. Silenciar el logger Winston para que los tests no ensucien stdout.
 */

// ── Variables de entorno ──────────────────────────────────────────────────────
// Estas variables deben estar definidas ANTES de que cualquier modulo de
// produccion se importe (p. ej. config/env.ts que lee process.env al cargarse).
// Como Vitest hoistea los vi.mock() antes de los imports, configurar las vars
// aqui es suficiente para los tests unitarios.

process.env["NODE_ENV"]      = "test";
process.env["JWT_SECRET"]    = "test-jwt-secret-key-for-testing-only";
process.env["DATABASE_URL"]  = "postgresql://test:test@localhost:5432/test_db";
process.env["PORT"]          = "4001";
process.env["FRONTEND_URL"]  = "http://localhost:5173";
process.env["EMAIL_FROM"]    = "test@variedadesdanii.com";
process.env["SMTP_HOST"]     = "smtp.test.com";
process.env["SMTP_PORT"]     = "587";
process.env["SMTP_USER"]     = "test@test.com";
process.env["SMTP_PASS"]     = "test-password";
process.env["WOMPI_PUB_KEY"] = "pub_test_key";
process.env["WOMPI_PRI_KEY"] = "pri_test_key";
process.env["WOMPI_EVT_KEY"] = "evt_test_key";
process.env["WOMPI_INT_KEY"] = "int_test_key";
process.env["DIAN_NIT"]      = "900123456";
process.env["DIAN_ENV"]      = "staging";
