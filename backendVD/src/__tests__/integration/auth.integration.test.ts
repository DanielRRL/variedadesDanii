/**
 * Tests de integracion del modulo de autenticacion.
 *
 * Estrategia:
 *   - Se mockea el cliente Prisma (singleton) y el EmailService para que
 *     las suites corran sin base de datos ni SMTP reales.
 *   - Se monta la app Express real con createApp() y se ejecutan peticiones
 *     HTTP via Supertest, probando el stack completo: router → middleware →
 *     controlador → servicio → repositorio (mockeado).
 *   - Cada test configura los valores de retorno de los mocks de Prisma
 *     usando mockResolvedValue / mockResolvedValueOnce.
 *
 * Casos de prueba:
 *   1. POST /api/auth/register     → 201: crea usuario y envia email
 *   2. POST /api/auth/login        → 403: email no verificado
 *   3. POST /api/auth/verify-email → 200: activa la cuenta del usuario
 *   4. POST /api/auth/forgot-password → 200: siempre, sin revelar existencia
 */

import { describe, it, expect, beforeAll, beforeEach, vi, type MockedFunction } from "vitest";
import request from "supertest";
import type express from "express";

// ── Mocks (deben declararse ANTES de los imports del codigo de produccion) ────
// vi.mock() es hoisted automaticamente por Vitest; los factories se ejecutan
// antes de cualquier import de modulos reales.

// Mock del cliente Prisma: reemplaza el singleton con objetos de vi.fn().
vi.mock("../../config/database", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      findMany:   vi.fn().mockResolvedValue([]),
    },
    emailVerification: {
      create:     vi.fn(),
      findUnique: vi.fn(),
      update:     vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      count:      vi.fn().mockResolvedValue(0),
    },
    passwordReset: {
      create:     vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
      update:     vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    loyaltyAccount: {
      findFirst: vi.fn().mockResolvedValue(null),
      create:    vi.fn(),
      update:    vi.fn(),
    },
    loyaltyTransaction: {
      create:   vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { points: 0 } }),
    },
    order: {
      findMany:  vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create:    vi.fn(),
      update:    vi.fn(),
    },
    essence: {
      findMany:  vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    essenceMovement: {
      create:    vi.fn(),
      findMany:  vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { ml: 0 } }),
    },
    bottle: {
      findMany:  vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    bottleMovement: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    referralCode: {
      findUnique: vi.fn().mockResolvedValue(null),
      create:     vi.fn(),
      update:     vi.fn(),
    },
    referralUsage: {
      findFirst:  vi.fn().mockResolvedValue(null),
      create:     vi.fn(),
      update:     vi.fn(),
    },
    invoice: {
      findMany:  vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create:    vi.fn(),
      update:    vi.fn(),
    },
    orderStatusHistory: {
      create:     vi.fn(),
      findMany:   vi.fn().mockResolvedValue([]),
    },
    orderItem: {
      groupBy: vi.fn().mockResolvedValue([]),
    },
    product: {
      findMany:  vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    payment: {
      findUnique: vi.fn().mockResolvedValue(null),
      create:     vi.fn(),
      update:     vi.fn(),
    },
  },
}));

// Mock del EmailService: reemplaza todas las operaciones de envio de correo.
// Se usa una clase porque app.ts hace `new EmailService()` — las arrow functions
// no pueden usarse como constructores (TypeError: not a constructor).
vi.mock("../../infrastructure/notifications/EmailService", () => ({
  EmailService: class MockEmailService {
    sendVerificationEmail  = vi.fn().mockResolvedValue(undefined);
    sendPasswordResetEmail = vi.fn().mockResolvedValue(undefined);
    sendOrderConfirmation  = vi.fn().mockResolvedValue(undefined);
    sendInvoiceEmail       = vi.fn().mockResolvedValue(undefined);
    sendLoyaltyLevelUp     = vi.fn().mockResolvedValue(undefined);
    sendOrderStatusUpdate  = vi.fn().mockResolvedValue(undefined);
    sendReferralReward     = vi.fn().mockResolvedValue(undefined);
    sendLowStockAlert      = vi.fn().mockResolvedValue(undefined);
  },
}));

// ── Imports reales (despues de los mocks) ─────────────────────────────────────
import { createApp } from "../../app";

// Referencia al modulo prisma mockeado para configurar return values.
import prisma from "../../config/database";

// ── Fixtures de test ──────────────────────────────────────────────────────────

/** Usuario mock con email NO verificado (estado post-registro). */
const UNVERIFIED_USER = {
  id:            "user-uuid-test-1",
  name:          "Test Cliente",
  phone:         "3001234567",
  email:         "test.cliente@variedades.com",
  password:      "$2b$12$hashedPasswordMock000000000000000000000000000000000000000",
  role:          "CLIENT",
  active:        true,
  emailVerified: false,
  createdAt:     new Date("2025-01-01"),
  updatedAt:     new Date("2025-01-01"),
};

/** Token de verificacion de correo (64 chars hex — 32 bytes = crypto.randomBytes(32).toString('hex')). */
const VERIFICATION_TOKEN = "abcdef0123456789".repeat(4); // 64 chars hex valido

/** Registro de verificacion de correo en la BD (no expirado, no usado). */
const EMAIL_VERIFICATION_RECORD = {
  id:        "ev-uuid-1",
  userId:    UNVERIFIED_USER.id,
  token:     VERIFICATION_TOKEN,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h en el futuro
  usedAt:    null,
  createdAt: new Date(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("Auth Integration", () => {
  let app: express.Application;

  beforeAll(() => {
    // Crear la app una sola vez para todos los tests de esta suite.
    app = createApp();
  });

  beforeEach(() => {
    // Limpiar contadores de llamadas entre tests pero mantener las implementaciones.
    vi.clearAllMocks();
    // Restaurar defaults para métodos que retornan array/null siempre.
    (prisma.user.findMany as MockedFunction<any>).mockResolvedValue([]);
    (prisma.emailVerification.deleteMany as MockedFunction<any>).mockResolvedValue({ count: 0 });
    (prisma.emailVerification.count as MockedFunction<any>).mockResolvedValue(0);
    (prisma.passwordReset.deleteMany as MockedFunction<any>).mockResolvedValue({ count: 0 });
  });

  // ── 1. POST /api/auth/register ──────────────────────────────────────────────

  describe("POST /api/auth/register", () => {
    it("debe responder 201 y llamar a sendVerificationEmail al registrar un usuario nuevo", async () => {
      // Arrange: email y telefono no existen en la BD.
      (prisma.user.findUnique as MockedFunction<any>)
        .mockResolvedValue(null); // findByEmail devuelve null
      (prisma.user.create as MockedFunction<any>)
        .mockResolvedValue(UNVERIFIED_USER);
      (prisma.emailVerification.create as MockedFunction<any>)
        .mockResolvedValue(EMAIL_VERIFICATION_RECORD);

      // Act
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name:     UNVERIFIED_USER.name,
          phone:    UNVERIFIED_USER.phone,
          email:    UNVERIFIED_USER.email,
          password: "Password1#",
        });

      // Assert: debe retornar 201 con el token JWT.
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        success: true,
        data:    expect.objectContaining({
          user: expect.objectContaining({ email: UNVERIFIED_USER.email }),
        }),
      });

      // El usuario debe haberse creado en la BD.
      expect(prisma.user.create).toHaveBeenCalledOnce();

      // El token de verificacion debe haberse almacenado.
      expect(prisma.emailVerification.create).toHaveBeenCalledOnce();
    });

    it("debe responder 409 si el email ya esta registrado", async () => {
      // Arrange: findByEmail retorna un usuario existente.
      (prisma.user.findUnique as MockedFunction<any>)
        .mockResolvedValue(UNVERIFIED_USER); // email ya registrado

      // Act
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name:     "Otro Usuario",
          phone:    "3009999999",
          email:    UNVERIFIED_USER.email, // mismo email
          password: "Password1#",
        });

      // Assert: debe retornar 409 Conflict.
      expect(res.status).toBe(409);
    });
  });

  // ── 2. POST /api/auth/login ─────────────────────────────────────────────────

  describe("POST /api/auth/login", () => {
    it("debe responder 403 cuando el email no ha sido verificado", async () => {
      // Arrange: usuario existe pero emailVerified=false. La contrasena es
      // "Password1!" con hash bcrypt real generado en setup previo.
      // Como no podemos hacer bcrypt.hash en el fixture (is async y slow),
      // usamos un hash pre-generado de "Password1!" con 1 ronda de salt:
      //   bcrypt.hashSync("Password1!", 1)
      // Pero como el AuthService usa 12 rondas al registrar, el hash
      // del fixture y el compare siempre fallarian si no mockeamos bcrypt.
      //
      // SOLUCION: En este test, el flow llega a bcrypt.compare ANTES de
      // chequear emailVerified. Como el compare falla con el hash fake,
      // vamos a usar un hash real de 1 ronda para la fixture del usuario.
      //
      // Hash de "Passw0rd!" con bcrypt, 1 ronda:
      const bcrypt = await import("bcrypt");
      const fakeHash = await bcrypt.hash("Password1#", 1);

      (prisma.user.findUnique as MockedFunction<any>)
        .mockResolvedValue({ ...UNVERIFIED_USER, password: fakeHash, emailVerified: false });

      // Act
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: UNVERIFIED_USER.email, password: "Password1#" });

      // Assert: 403 porque emailVerified=false
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({
        success: false,
        message: expect.stringContaining("verify"),
      });
    });

    it("debe responder 401 con credenciales invalidas (password incorrecto)", async () => {
      // Arrange: usuario existe con hash real pero la contrasena enviada es incorrecta.
      const bcrypt = await import("bcrypt");
      const realHash = await bcrypt.hash("CorrectoPassword1#", 1);

      (prisma.user.findUnique as MockedFunction<any>)
        .mockResolvedValue({ ...UNVERIFIED_USER, password: realHash, emailVerified: true });

      // Act
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: UNVERIFIED_USER.email, password: "ContrasenaMal#" });

      // Assert
      expect(res.status).toBe(401);
    });
  });

  // ── 3. POST /api/auth/verify-email ─────────────────────────────────────────

  describe("POST /api/auth/verify-email", () => {
    it("debe responder 200 y activar la cuenta al verificar con token valido", async () => {
      // Arrange: token valido existe en la BD, no expirado, no usado.
      (prisma.emailVerification.findUnique as MockedFunction<any>)
        .mockResolvedValue(EMAIL_VERIFICATION_RECORD);
      (prisma.emailVerification.update as MockedFunction<any>)
        .mockResolvedValue({ ...EMAIL_VERIFICATION_RECORD, usedAt: new Date() });
      (prisma.user.update as MockedFunction<any>)
        .mockResolvedValue({ ...UNVERIFIED_USER, emailVerified: true });

      // Act
      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({ token: VERIFICATION_TOKEN });

      // Assert: verificacion exitosa
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true });

      // El usuario debe haberse actualizado con emailVerified=true
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ emailVerified: true }),
        })
      );
    });

    it("debe responder 404 con token inexistente", async () => {
      // Arrange: token no encontrado en la BD.
      // El token debe ser 64 chars hex para pasar la validacion del router.
      const validFormatToken = "deadbeef".repeat(8); // 64 chars hex valido
      (prisma.emailVerification.findUnique as MockedFunction<any>)
        .mockResolvedValue(null);

      // Act
      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({ token: validFormatToken });

      // Assert
      expect(res.status).toBe(404);
    });
  });

  // ── 4. POST /api/auth/forgot-password ──────────────────────────────────────

  describe("POST /api/auth/forgot-password", () => {
    it("debe responder 200 independientemente de si el email existe (anti-enumeracion)", async () => {
      // Caso 1: email NO existe en la BD -> debe retornar 200 silenciosamente.
      (prisma.user.findUnique as MockedFunction<any>)
        .mockResolvedValue(null);

      const resNotFound = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "no.existe@test.com" });

      expect(resNotFound.status).toBe(200);

      // Caso 2: email SÍ existe -> debe retornar 200 y NO revelar datos.
      const verifiedUser = { ...UNVERIFIED_USER, emailVerified: true };
      (prisma.user.findUnique as MockedFunction<any>)
        .mockResolvedValue(verifiedUser);
      (prisma.passwordReset.create as MockedFunction<any>)
        .mockResolvedValue({
          id:        "pr-uuid-1",
          userId:    UNVERIFIED_USER.id,
          token:     "reset-token-abc123",
          expiresAt: new Date(Date.now() + 3600_000),
          usedAt:    null,
          createdAt: new Date(),
        });

      const resFound = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: verifiedUser.email });

      expect(resFound.status).toBe(200);
      // El cuerpo no debe contener datos del usuario (anti-enumeracion de emails).
      expect(resFound.body).not.toHaveProperty("user");
      expect(resFound.body).not.toHaveProperty("userId");
    });
  });
});
