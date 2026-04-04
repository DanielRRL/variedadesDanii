/**
 * Mock del servicio de email para tests.
 *
 * Implementa IEmailService con vi.fn() para que los tests puedan:
 *   - Verificar si el metodo fue llamado (.toHaveBeenCalled()).
 *   - Inspeccionar los argumentos (.toHaveBeenCalledWith(...)).
 *   - Resetear entre tests (vi.clearAllMocks() en beforeEach).
 *
 * Todos los metodos resuelven con undefined (void) sin hacer nada,
 * lo que evita la dependencia de Nodemailer/SMTP en el entorno de tests.
 */

import { vi } from "vitest";
import type { IEmailService } from "../../application/services/IEmailService";

export const mockEmailService: IEmailService = {
  sendVerificationEmail:  vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderConfirmation:  vi.fn().mockResolvedValue(undefined),
  sendInvoiceEmail:       vi.fn().mockResolvedValue(undefined),
  sendLoyaltyLevelUp:     vi.fn().mockResolvedValue(undefined),
  sendOrderStatusUpdate:  vi.fn().mockResolvedValue(undefined),
  sendReferralReward:     vi.fn().mockResolvedValue(undefined),
  sendLowStockAlert:      vi.fn().mockResolvedValue(undefined),
  sendSimpleInvoice:      vi.fn().mockResolvedValue(undefined),
};
