/**
 * Tests unitarios para LoyaltyService.
 *
 * Estrategia: todos los repositorios y el servicio de email se inyectan
 * como mocks (vi.fn()). Los tests verifican comportamiento del servicio
 * de forma aislada sin tocar la base de datos ni SMTP.
 *
 * Suite: 6 casos de uso principales del programa de fidelizacion.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { LoyaltyService, POINTS_PER_PESO, BOTTLE_RETURN_BONUS, PREFERRED_THRESHOLD, VIP_THRESHOLD } from "../../../application/services/LoyaltyService";
import { LoyaltyAccount, LoyaltyLevel, LoyaltyTxType } from "../../../domain/entities/LoyaltyAccount";
import type { ILoyaltyRepository } from "../../../domain/repositories/ILoyaltyRepository";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository";
import type { IEmailService } from "../../../application/services/IEmailService";
import { mockEmailService } from "../../mocks/MockEmailService";

// ── Helpers de fixture ────────────────────────────────────────────────────────

/** Crea un LoyaltyAccount con valores predeterminados sobreescribibles. */
function makeAccount(overrides: Partial<LoyaltyAccount> = {}): LoyaltyAccount {
  return new LoyaltyAccount({
    id:         "account-uuid-1",
    userId:     "user-uuid-1",
    points:     0,
    level:      LoyaltyLevel.BASIC,
    discountPct: 0,
    ...overrides,
  });
}

// ── Mock de repositorios ──────────────────────────────────────────────────────

/** Construye un ILoyaltyRepository totalmente mockeado. */
function makeLoyaltyRepoMock(): ILoyaltyRepository {
  return {
    findAccountByUserId:    vi.fn(),
    createAccount:          vi.fn(),
    updateAccount:          vi.fn(),
    addTransaction:         vi.fn(),
    getTransactionsByAccount: vi.fn().mockResolvedValue([]),
  };
}

/** Construye un IUserRepository totalmente mockeado (solo los métodos que usa LoyaltyService). */
function makeUserRepoMock(): IUserRepository {
  return {
    findAll:            vi.fn().mockResolvedValue([]),
    findById:           vi.fn().mockResolvedValue(null),
    findByEmail:        vi.fn().mockResolvedValue(null),
    findByPhone:        vi.fn().mockResolvedValue(null),
    create:             vi.fn(),
    update:             vi.fn(),
    delete:             vi.fn(),
    countOrdersByUser:  vi.fn().mockResolvedValue(0),
  };
}

// ── Suite principal ───────────────────────────────────────────────────────────

describe("LoyaltyService", () => {
  let loyaltyRepo: ILoyaltyRepository;
  let userRepo: IUserRepository;
  let emailService: IEmailService;
  let service: LoyaltyService;

  beforeEach(() => {
    vi.clearAllMocks();
    loyaltyRepo  = makeLoyaltyRepoMock();
    userRepo     = makeUserRepoMock();
    emailService = { ...mockEmailService }; // reset vi.fn() state
    // Reinicializar los mocks del emailService
    (emailService.sendLoyaltyLevelUp as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    service = new LoyaltyService(loyaltyRepo, userRepo, emailService as IEmailService);
  });

  // ── 1. getOrCreateAccount ─────────────────────────────────────────────────

  it("debe crear una cuenta de fidelizacion si el usuario no tiene una", async () => {
    // Arrange: el usuario no tiene cuenta existente.
    const newAccount = makeAccount();
    (loyaltyRepo.findAccountByUserId as ReturnType<typeof vi.fn>)
      .mockResolvedValue(null);
    (loyaltyRepo.createAccount as ReturnType<typeof vi.fn>)
      .mockResolvedValue(newAccount);

    // Act
    const result = await service.getOrCreateAccount("user-uuid-1");

    // Assert: debe crear la cuenta ya que no existia.
    expect(loyaltyRepo.createAccount).toHaveBeenCalledWith({ userId: "user-uuid-1" });
    expect(result).toBe(newAccount);
  });

  it("debe retornar la cuenta existente sin crear una nueva", async () => {
    // Arrange: el usuario ya tiene cuenta.
    const existingAccount = makeAccount({ points: 1500 });
    (loyaltyRepo.findAccountByUserId as ReturnType<typeof vi.fn>)
      .mockResolvedValue(existingAccount);

    // Act
    const result = await service.getOrCreateAccount("user-uuid-1");

    // Assert: no debe crear una nueva cuenta.
    expect(loyaltyRepo.createAccount).not.toHaveBeenCalled();
    expect(result.points).toBe(1500);
  });

  // ── 2. calculatePointsForOrder ────────────────────────────────────────────

  it("debe calcular los puntos correctamente segun POINTS_PER_PESO", () => {
    // POINTS_PER_PESO = 1, entonces $50.000 COP = 50.000 puntos.
    expect(service.calculatePointsForOrder(50_000)).toBe(50_000 * POINTS_PER_PESO);
    expect(service.calculatePointsForOrder(25_500)).toBe(Math.floor(25_500 * POINTS_PER_PESO));
    expect(service.calculatePointsForOrder(0)).toBe(0);
  });

  // ── 3. earnPoints — acredita puntos y registra transaccion ───────────────

  it("debe acreditar puntos y llamar a addTransaction con tipo EARN", async () => {
    // Arrange
    const account = makeAccount({ points: 1000 });
    const updatedAccount = makeAccount({ points: 1200 });
    (loyaltyRepo.findAccountByUserId as ReturnType<typeof vi.fn>)
      .mockResolvedValue(account);
    (loyaltyRepo.updateAccount as ReturnType<typeof vi.fn>)
      .mockResolvedValue(updatedAccount);
    // countOrdersByUser = 2: no llega a ningun umbral, no sube de nivel.
    (userRepo.countOrdersByUser as ReturnType<typeof vi.fn>)
      .mockResolvedValue(2);

    // Act
    await service.earnPoints("user-uuid-1", {
      points:      200,
      reason:      "Bonus por devolucion de frasco",
      referenceId: "bottle-return-uuid",
    });

    // Assert: la cuenta debe actualizarse con el nuevo saldo.
    expect(loyaltyRepo.updateAccount).toHaveBeenCalledWith("account-uuid-1", {
      points: 1200,
    });
    // Assert: debe registrar la transaccion de tipo EARN.
    expect(loyaltyRepo.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "account-uuid-1",
        type:      LoyaltyTxType.EARN,
        points:    200,
      })
    );
  });

  it("debe lanzar AppError 400 al intentar earn con puntos <= 0", async () => {
    await expect(
      service.earnPoints("user-uuid-1", { points: 0, reason: "test" })
    ).rejects.toMatchObject({ statusCode: 400 });

    await expect(
      service.earnPoints("user-uuid-1", { points: -10, reason: "test" })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  // ── 4. redeemPoints — canje de puntos ────────────────────────────────────

  it("debe lanzar AppError 400 al intentar canjear mas puntos de los disponibles", async () => {
    // Arrange: la cuenta tiene solo 100 puntos pero se piden 500.
    const account = makeAccount({ points: 100 });
    (loyaltyRepo.findAccountByUserId as ReturnType<typeof vi.fn>)
      .mockResolvedValue(account);

    // Act & Assert
    await expect(
      service.redeemPoints("user-uuid-1", { points: 500, orderId: "order-uuid-1" })
    ).rejects.toMatchObject({
      statusCode: 400,
      message:    expect.stringContaining("Insufficient points"),
    });

    // El saldo no debe modificarse.
    expect(loyaltyRepo.updateAccount).not.toHaveBeenCalled();
  });

  // ── 5. checkAndUpgradeLevel — subida de nivel ─────────────────────────────

  it("debe subir de BASIC a PREFERRED cuando el usuario alcanza 5 ordenes entregadas", async () => {
    // Arrange: cuenta en nivel BASIC, 5 ordenes entregadas.
    const account = makeAccount({ level: LoyaltyLevel.BASIC });
    const upgradeTarget = makeAccount({ level: LoyaltyLevel.PREFERRED, discountPct: 5 });
    (loyaltyRepo.updateAccount as ReturnType<typeof vi.fn>)
      .mockResolvedValue(upgradeTarget);
    // El usuario existe: se envía email de subida de nivel.
    (userRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-uuid-1", email: "cliente@test.com", name: "Cliente Test",
    });

    // Act
    await service.checkAndUpgradeLevel(account, PREFERRED_THRESHOLD);

    // Assert: debe actualizar el nivel a PREFERRED con 5% de descuento.
    expect(loyaltyRepo.updateAccount).toHaveBeenCalledWith("account-uuid-1", {
      level:       LoyaltyLevel.PREFERRED,
      discountPct: 5,
    });
    // Assert: debe enviar el correo de felicitacion.
    expect(emailService.sendLoyaltyLevelUp).toHaveBeenCalledWith(
      "cliente@test.com",
      expect.objectContaining({ newLevel: LoyaltyLevel.PREFERRED, discountPct: 5 })
    );
  });

  it("debe subir de PREFERRED a VIP cuando el usuario alcanza 10 ordenes entregadas", async () => {
    // Arrange: cuenta en nivel PREFERRED, 10 ordenes entregadas.
    const account = makeAccount({
      level:       LoyaltyLevel.PREFERRED,
      discountPct: 5,
    });
    const upgradeTarget = makeAccount({ level: LoyaltyLevel.VIP, discountPct: 10 });
    (loyaltyRepo.updateAccount as ReturnType<typeof vi.fn>)
      .mockResolvedValue(upgradeTarget);
    (userRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-uuid-1", email: "vip@test.com", name: "Cliente VIP",
    });

    // Act
    await service.checkAndUpgradeLevel(account, VIP_THRESHOLD);

    // Assert: nivel debe ser VIP con 10%.
    expect(loyaltyRepo.updateAccount).toHaveBeenCalledWith("account-uuid-1", {
      level:       LoyaltyLevel.VIP,
      discountPct: 10,
    });
  });

  it("no debe bajar de nivel aunque las ordenes esten por debajo del umbral actual", async () => {
    // Arrange: cuenta en nivel VIP pero solo 3 ordenes (esto no debe bajar el nivel).
    const account = makeAccount({
      level:       LoyaltyLevel.VIP,
      discountPct: 10,
    });

    // Act: entregar 3 pedidos no debe bajar de VIP
    await service.checkAndUpgradeLevel(account, 3);

    // Assert: no debe modificarse la cuenta.
    expect(loyaltyRepo.updateAccount).not.toHaveBeenCalled();
  });
});
