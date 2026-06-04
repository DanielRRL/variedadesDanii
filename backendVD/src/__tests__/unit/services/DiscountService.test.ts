/**
 * Tests unitarios para DiscountService.
 *
 * Estrategia: IUserRepository e IBottleReturnRepository se inyectan como
 * mocks (vi.fn()). Los tests verifican cada regla de descuento de forma
 * completamente aislada sin tocar la base de datos.
 *
 * Reglas de negocio bajo prueba:
 *   1. Descuento por devolucion de frasco: siempre 10%.
 *   2. Descuento por cliente frecuente: 5% cada 5 compras entregadas (multiplo exacto).
 *   3. Descuento por volumen: 8% si total >= 90 ml.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { DiscountService, DiscountType } from "../../../application/services/DiscountService";
import type { IUserRepository } from "../../../domain/repositories/IUserRepository";

// ── Mocks de repositorios ─────────────────────────────────────────────────────

function makeUserRepoMock(): IUserRepository {
  return {
    findAll:           vi.fn().mockResolvedValue([]),
    findById:          vi.fn().mockResolvedValue(null),
    findByEmail:       vi.fn().mockResolvedValue(null),
    findByPhone:       vi.fn().mockResolvedValue(null),
    create:            vi.fn(),
    update:            vi.fn(),
    delete:            vi.fn(),
    countOrdersByUser: vi.fn().mockResolvedValue(0),
  };
}

// ── Suite principal ───────────────────────────────────────────────────────────

describe("DiscountService", () => {
  let userRepo: IUserRepository;
  let service: DiscountService;

  const BASE_SUBTOTAL = 100_000; // $100.000 COP como subtotal de referencia.

  beforeEach(() => {
    vi.clearAllMocks();
    userRepo = makeUserRepoMock();
    service  = new DiscountService(userRepo);
  });

  // ── 2. calculateFrequentClientDiscount ───────────────────────────────────

  describe("calculateFrequentClientDiscount", () => {
    it("debe retornar 5% cuando el usuario tiene exactamente 5 ordenes entregadas", async () => {
      (userRepo.countOrdersByUser as ReturnType<typeof vi.fn>)
        .mockResolvedValue(5);

      const result = await service.calculateFrequentClientDiscount("user-1", BASE_SUBTOTAL);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(DiscountType.FREQUENT_CLIENT);
      expect(result!.percentage).toBe(5);
      expect(result!.amount).toBe(5_000); // 5% de $100.000
    });

    it("debe retornar 5% cuando el usuario tiene 10 ordenes entregadas (multiplo de 5)", async () => {
      (userRepo.countOrdersByUser as ReturnType<typeof vi.fn>)
        .mockResolvedValue(10);

      const result = await service.calculateFrequentClientDiscount("user-1", BASE_SUBTOTAL);

      expect(result).not.toBeNull();
      expect(result!.percentage).toBe(5);
    });

    it("debe retornar null cuando el usuario tiene 3 ordenes (no es multiplo de 5)", async () => {
      (userRepo.countOrdersByUser as ReturnType<typeof vi.fn>)
        .mockResolvedValue(3);

      const result = await service.calculateFrequentClientDiscount("user-1", BASE_SUBTOTAL);

      expect(result).toBeNull();
    });

    it("debe retornar null cuando el usuario no tiene ordenes entregadas", async () => {
      (userRepo.countOrdersByUser as ReturnType<typeof vi.fn>)
        .mockResolvedValue(0);

      const result = await service.calculateFrequentClientDiscount("user-1", BASE_SUBTOTAL);

      expect(result).toBeNull();
    });

    it("debe retornar null cuando el usuario tiene 7 ordenes (no es multiplo de 5)", async () => {
      (userRepo.countOrdersByUser as ReturnType<typeof vi.fn>)
        .mockResolvedValue(7);

      const result = await service.calculateFrequentClientDiscount("user-1", BASE_SUBTOTAL);

      expect(result).toBeNull();
    });
  });

  // ── 3. calculateVolumeDiscount ────────────────────────────────────────────

  describe("calculateVolumeDiscount", () => {
    it("debe retornar 8% cuando el total de ml >= 90 (exactamente en el umbral)", async () => {
      const result = await service.calculateVolumeDiscount(90, BASE_SUBTOTAL);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(DiscountType.VOLUME);
      expect(result!.percentage).toBe(8);
      expect(result!.amount).toBe(8_000); // 8% de $100.000
    });

    it("debe retornar 8% cuando el total de ml es mayor al umbral (120 ml)", async () => {
      const result = await service.calculateVolumeDiscount(120, BASE_SUBTOTAL);

      expect(result).not.toBeNull();
      expect(result!.percentage).toBe(8);
    });

    it("debe retornar null cuando el total de ml < 90 (89 ml)", async () => {
      const result = await service.calculateVolumeDiscount(89, BASE_SUBTOTAL);

      expect(result).toBeNull();
    });

    it("debe retornar null cuando el total de ml es 0", async () => {
      const result = await service.calculateVolumeDiscount(0, BASE_SUBTOTAL);

      expect(result).toBeNull();
    });
  });

  // ── 3. calculateAllDiscounts — acumulacion de descuentos ─────────────────

  describe("calculateAllDiscounts", () => {
    it("debe acumular todos los descuentos cuando todas las condiciones se cumplen", async () => {
      (userRepo.countOrdersByUser as ReturnType<typeof vi.fn>)
        .mockResolvedValue(5); // Frecuente: si

      const discounts = await service.calculateAllDiscounts(
        "user-1",
        BASE_SUBTOTAL,
        100 // >= 90 ml: volumen aplica
      );

      expect(discounts).toHaveLength(2);
      const types = discounts.map((d) => d.type);
      expect(types).toContain(DiscountType.FREQUENT_CLIENT);
      expect(types).toContain(DiscountType.VOLUME);
    });

    it("debe retornar solo descuento de volumen cuando no hay frecuencia", async () => {
      (userRepo.countOrdersByUser as ReturnType<typeof vi.fn>)
        .mockResolvedValue(3); // No es frecuente

      const discounts = await service.calculateAllDiscounts(
        "user-1",
        BASE_SUBTOTAL,
        90 // volumen aplica
      );

      expect(discounts).toHaveLength(1);
      expect(discounts[0].type).toBe(DiscountType.VOLUME);
    });

    it("debe retornar lista vacia cuando ningun descuento aplica", async () => {
      (userRepo.countOrdersByUser as ReturnType<typeof vi.fn>)
        .mockResolvedValue(3); // No frecuente

      const discounts = await service.calculateAllDiscounts(
        "user-1",
        BASE_SUBTOTAL,
        50 // < 90 ml: no aplica volumen
      );

      expect(discounts).toHaveLength(0);
    });
  });
});
