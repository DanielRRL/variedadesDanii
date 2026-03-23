/**
 * Servicio de Codigos de Referido (Referral).
 * Gestiona la generacion de codigos unicos de referido y el flujo completo
 * de recompensas cuando un nuevo usuario se registra usando el codigo de otro.
 * Delega la acreditacion de puntos al LoyaltyService.
 */

// crypto - Generacion de bytes aleatorios para construir los codigos.
import crypto from "crypto";

// IReferralRepository - Contrato de persistencia para codigos y usos.
import { IReferralRepository } from "../../domain/repositories/IReferralRepository";

// IUserRepository - Para buscar datos del usuario (nombre, email).
import { IUserRepository } from "../../domain/repositories/IUserRepository";

// LoyaltyService - Para acreditar puntos a ambas partes del referido.
import { LoyaltyService, REFERRAL_BONUS } from "./LoyaltyService";

// ReferralCode - Entidad de dominio del codigo de referido.
import { ReferralCode } from "../../domain/entities/ReferralCode";

// AppError - Errores HTTP personalizados.
import { AppError } from "../../utils/AppError";

// logger - Logger centralizado Winston.
import logger from "../../utils/logger";

// ---------------------------------------------------------------------------
// Constantes del modulo de referidos
// ---------------------------------------------------------------------------

/** Longitud en caracteres del codigo de referido generado. */
export const REFERRAL_CODE_LENGTH = 8;

/** Puntos acreditados a cada parte (referidor y referido) por un referido exitoso. */
export const REFERRAL_BONUS_BOTH_PARTIES = REFERRAL_BONUS;

/** Caracteres permitidos en el codigo alfanumerico de referido (mayusculas + digitos). */
const REFERRAL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Maximo de intentos para generar un codigo unico antes de lanzar error. */
const MAX_GENERATION_ATTEMPTS = 10;

export class ReferralService {
  /**
   * Recibe colaboradores via inyeccion de dependencias.
   * @param referralRepo  - Repositorio de codigos y usos de referidos.
   * @param loyaltyService - Servicio de puntos para acreditar recompensas.
   * @param userRepo       - Repositorio de usuarios para obtener datos del cliente.
   */
  constructor(
    private readonly referralRepo: IReferralRepository,
    private readonly loyaltyService: LoyaltyService,
    private readonly userRepo: IUserRepository,
  ) {}

  /**
   * Busca el codigo de referido del usuario o crea uno nuevo unico si no existe.
   * Genera codigos alfanumericos en mayusculas de REFERRAL_CODE_LENGTH caracteres.
   * Reintenta hasta MAX_GENERATION_ATTEMPTS veces si el codigo ya existe.
   * @param userId - UUID del usuario propietario del codigo.
   * @returns El codigo de referido existente o el recien creado.
   * @throws AppError 500 si no puede generar un codigo unico tras los intentos maximos.
   */
  async getOrCreateCode(userId: string): Promise<ReferralCode> {
    // Verificar si el usuario ya tiene un codigo generado
    const existing = await this.referralRepo.findCodeByUserId(userId);
    if (existing) {
      return existing;
    }

    // Generar un nuevo codigo unico
    let attempts = 0;
    while (attempts < MAX_GENERATION_ATTEMPTS) {
      const candidate = this.generateCode();
      const collision = await this.referralRepo.findCodeByCode(candidate);
      if (!collision) {
        const created = await this.referralRepo.createCode({
          userId,
          code: candidate,
        });
        logger.info("Referral code created", { userId, code: candidate });
        return created;
      }
      attempts++;
    }

    throw AppError.internal(
      "Unable to generate a unique referral code. Please try again."
    );
  }

  /**
   * Aplica un codigo de referido para un nuevo usuario.
   * Flujo completo:
   * 1. Busca el codigo; lanza 404 si no existe.
   * 2. Valida que el nuevo usuario no sea el dueno del codigo (anti-fraude).
   * 3. Valida que el nuevo usuario no haya usado ya un codigo de referido.
   * 4. Registra el uso del codigo (ReferralUsage).
   * 5. Acredita REFERRAL_BONUS_BOTH_PARTIES puntos al nuevo usuario.
   * 6. Acredita REFERRAL_BONUS_BOTH_PARTIES puntos al dueno del codigo.
   * 7. Incrementa el contador de usos del codigo.
   * 8. Marca el uso como recompensado (rewardGiven=true).
   * @param code       - Cadena del codigo de referido a aplicar.
   * @param newUserId  - UUID del nuevo usuario que aplica el codigo.
   * @throws AppError 404 si el codigo no existe.
   * @throws AppError 400 si el usuario intenta usar su propio codigo.
   * @throws AppError 409 si el usuario ya utilizo un codigo de referido antes.
   */
  async applyReferralCode(code: string, newUserId: string): Promise<void> {
    // Buscar el codigo en la BD
    const referralCode = await this.referralRepo.findCodeByCode(code.toUpperCase());
    if (!referralCode) {
      throw AppError.notFound("Referral code not found.");
    }

    // Prevenir auto-referido
    if (referralCode.userId === newUserId) {
      throw AppError.badRequest("You cannot use your own referral code.");
    }

    // Verificar que el nuevo usuario no haya usado ya un codigo
    const existingUsage = await this.referralRepo.findUsageByNewUserId(newUserId);
    if (existingUsage) {
      throw AppError.conflict("You have already used a referral code.");
    }

    // Registrar el uso del codigo
    const usage = await this.referralRepo.createUsage({
      referralCodeId: referralCode.id!,
      newUserId,
    });

    // Acreditar puntos al nuevo usuario
    await this.loyaltyService.earnPoints(newUserId, {
      points:      REFERRAL_BONUS_BOTH_PARTIES,
      reason:      `Bono por usar codigo de referido: ${code.toUpperCase()}`,
      referenceId: referralCode.id,
    });

    // Acreditar puntos al dueno del codigo (referidor)
    const referrerId = referralCode.userId;
    await this.loyaltyService.earnPoints(referrerId, {
      points:      REFERRAL_BONUS_BOTH_PARTIES,
      reason:      `Bono por referir a un nuevo cliente`,
      referenceId: newUserId,
    });

    // Incrementar contador de usos del codigo
    await this.referralRepo.incrementUsageCount(referralCode.id!);

    // Marcar el uso como recompensado
    await this.referralRepo.markRewardGiven(usage.id!);

    logger.info("Referral code applied", {
      code:        code.toUpperCase(),
      newUserId,
      referrerId,
      pointsEach:  REFERRAL_BONUS_BOTH_PARTIES,
    });
  }

  /**
   * Retorna las estadisticas del codigo de referido de un usuario.
   * Incluye el codigo generado (creandolo si no existe), la cantidad de
   * veces que fue usado y el total de referidos exitosos.
   * @param userId - UUID del usuario propietario del codigo.
   * @returns Objeto con code, usageCount y totalReferrals.
   */
  async getCodeStats(userId: string): Promise<{
    code: string;
    usageCount: number;
    totalReferrals: number;
  }> {
    const referralCode = await this.getOrCreateCode(userId);
    return {
      code:           referralCode.code,
      usageCount:     referralCode.usageCount,
      totalReferrals: referralCode.usageCount,
    };
  }

  /**
   * Genera una cadena alfanumerica aleatoria de REFERRAL_CODE_LENGTH caracteres.
   * Usa crypto.randomBytes para entropia criptografica.
   * El modulo sobre la longitud del alfabeto introduce sesgo marginal
   * aceptable para codigos de referido no criticos en seguridad.
   * @returns Codigo candidato en mayusculas.
   */
  private generateCode(): string {
    const bytes = crypto.randomBytes(REFERRAL_CODE_LENGTH);
    let result = "";
    for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
      result += REFERRAL_CHARS[bytes[i] % REFERRAL_CHARS.length];
    }
    return result;
  }
}
