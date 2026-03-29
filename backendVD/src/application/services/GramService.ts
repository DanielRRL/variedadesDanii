/**
 * Servicio de Gramos (GramService).
 * Manages the gram accumulation and redemption system.
 * Grams are the gamification currency: earned by purchases and games, redeemed for essences.
 * Max 13 grams simultaneously (= 1 oz). Redemption requires 5+ confirmed purchases.
 *
 * Sigue el principio de inversion de dependencias (DIP):
 * depende de interfaces, no de implementaciones concretas.
 */

// IGramRepository - Contrato de persistencia para billeteras y transacciones de gramos.
import { IGramRepository } from "../../domain/repositories/IGramRepository";

// IEssenceRedemptionRepository - Contrato de persistencia para canjes de esencia.
import { IEssenceRedemptionRepository } from "../../domain/repositories/IEssenceRedemptionRepository";

// IEmailService - Para enviar correo al habilitar canje.
import { IEmailService } from "./IEmailService";

// Entidades de dominio.
import { GramAccount, GramSourceType } from "../../domain/entities/GramAccount";
import { GramTransaction } from "../../domain/entities/GramTransaction";
import { EssenceRedemption } from "../../domain/entities/EssenceRedemption";

// AppError - Errores HTTP personalizados.
import { AppError } from "../../utils/AppError";

// logger - Logger centralizado Winston.
import logger from "../../utils/logger";

// ---------------------------------------------------------------------------
// Constantes de reglas de negocio del sistema de gramos
// ---------------------------------------------------------------------------

/** Gramos otorgados por cada producto vendible comprado (LOTION/CREAM/SHAMPOO/MAKEUP/SPLASH). */
export const GRAMS_PER_PURCHASE = 1;

/** Gramos bonus al canjear 1 oz o mas de esencia. */
export const GRAMS_FOR_ESSENCE_OZ_BONUS = 1;

/** Conversion: 13 gramos = 1 onza de esencia. */
export const GRAMS_PER_OZ = 13;

/** Maximo de gramos que un usuario puede tener simultaneamente. */
export const MAX_GRAMS = 13;

/** Compras entregadas minimas para desbloquear el canje de gramos. */
export const MIN_PURCHASES_TO_REDEEM = 5;

/** Descuento de referido solo en productos vendibles (no esencias). */
export const REFERRAL_DISCOUNT_PCT = 5;

export class GramService {
  /**
   * Recibe repositorios y servicio de email via inyeccion de dependencias.
   * @param gramRepo              - Repositorio de billeteras y transacciones de gramos.
   * @param essenceRedemptionRepo - Repositorio de canjes de esencia.
   * @param emailService          - Servicio de correo para notificaciones.
   */
  constructor(
    private readonly gramRepo: IGramRepository,
    private readonly essenceRedemptionRepo: IEssenceRedemptionRepository,
    private readonly emailService: IEmailService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // getOrCreateAccount
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene la billetera de gramos del usuario, o la crea si no existe.
   * Se invoca antes de cualquier operacion que requiera una billetera.
   * @param userId - UUID del usuario.
   * @returns GramAccount existente o recien creada con 0 gramos.
   */
  async getOrCreateAccount(userId: string): Promise<GramAccount> {
    const existing = await this.gramRepo.findAccountByUserId(userId);
    if (existing) return existing;
    return this.gramRepo.createAccount(userId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // earnGrams
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Acumula gramos en la billetera del usuario.
   * Si la suma excede MAX_GRAMS (13), se capea en 13 — nunca se almacenan mas.
   * Si el balance resultante alcanza 13, se llama autoConvertToOunce() para
   * crear automaticamente un EssenceRedemption PENDING_DELIVERY.
   *
   * @param userId - UUID del usuario que gana gramos.
   * @param data.sourceType  - Origen del movimiento (compra, juego, reto, etc.).
   * @param data.grams       - Gramos a acumular (siempre positivo).
   * @param data.description - Descripcion legible del movimiento.
   * @param data.referenceId - ID opcional del pedido, ficha o reto origen.
   * @returns newBalance, si se completo 1 oz, y el canje creado si aplica.
   */
  async earnGrams(
    userId: string,
    data: {
      sourceType: GramSourceType;
      grams: number;
      description: string;
      referenceId?: string;
    }
  ): Promise<{
    newBalance: number;
    ozCompleted: boolean;
    redemptionCreated?: EssenceRedemption;
  }> {
    // Paso 1: Obtener o crear la billetera
    const account = await this.getOrCreateAccount(userId);

    // Paso 2: Calcular nuevo balance sin exceder MAX_GRAMS
    const newBalance = Math.min(MAX_GRAMS, account.currentGrams + data.grams);

    // Paso 3: Calcular gramos efectivamente agregados (puede ser menos si cerca del tope)
    const actualGramsAdded = newBalance - account.currentGrams;

    if (actualGramsAdded <= 0) {
      logger.warn("earnGrams: usuario ya tiene el maximo de gramos", {
        userId,
        currentGrams: account.currentGrams,
        requestedGrams: data.grams,
      });
      return { newBalance: account.currentGrams, ozCompleted: false };
    }

    // Paso 4: Incrementar atomicamente los gramos de la billetera
    await this.gramRepo.updateAccountGrams(account.id!, actualGramsAdded);

    // Paso 5: Registrar la transaccion en el historial
    await this.gramRepo.addTransaction({
      accountId:   account.id!,
      sourceType:  data.sourceType,
      gramsDelta:  actualGramsAdded,
      description: data.description,
      referenceId: data.referenceId,
    });

    logger.info("Gramos acumulados", {
      userId,
      sourceType: data.sourceType,
      requested: data.grams,
      actual: actualGramsAdded,
      newBalance,
    });

    // Paso 6: Si el balance llego a 13, convertir automaticamente a 1 oz
    let redemptionCreated: EssenceRedemption | undefined;
    if (newBalance === MAX_GRAMS) {
      redemptionCreated = await this.autoConvertToOunce(userId);
    }

    return {
      newBalance: redemptionCreated ? 0 : newBalance,
      ozCompleted: newBalance === MAX_GRAMS,
      redemptionCreated,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // autoConvertToOunce
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Convierte automaticamente 13 gramos a 1 onza de esencia.
   * Se invoca cuando currentGrams alcanza 13.
   *
   * Pasos:
   * 1. Descontar 13 gramos de la billetera (queda en 0).
   * 2. Registrar GramTransaction con sourceType=REDEMPTION, gramsDelta=-13.
   * 3. Crear EssenceRedemption con status=PENDING_DELIVERY, 13g, 1.0 oz.
   *    Nota: essenceName queda como "Pendiente de seleccion" hasta que el
   *    admin o usuario elija la esencia concreta.
   *
   * @param userId - UUID del usuario.
   * @returns EssenceRedemption creado.
   */
  async autoConvertToOunce(userId: string): Promise<EssenceRedemption> {
    const account = await this.gramRepo.findAccountByUserId(userId);
    if (!account) {
      throw AppError.notFound("Billetera de gramos no encontrada.");
    }

    // Paso 1: Descontar 13 gramos atomicamente
    await this.gramRepo.updateAccountGrams(account.id!, -GRAMS_PER_OZ);

    // Paso 2: Registrar la salida de gramos en el historial
    await this.gramRepo.addTransaction({
      accountId:   account.id!,
      sourceType:  GramSourceType.REDEMPTION,
      gramsDelta:  -GRAMS_PER_OZ,
      description: "Conversion automatica: 13g = 1 oz de esencia",
    });

    // Paso 3: Crear el registro de canje pendiente de entrega
    const redemption = await this.essenceRedemptionRepo.create({
      userId,
      gramsUsed:   GRAMS_PER_OZ,
      ozRedeemed:  1.0,
      essenceName: "Pendiente de seleccion",
    });

    logger.info("Auto-conversion a 1 oz completada", { userId, redemptionId: redemption.id });

    return redemption;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // redeemPartialGrams
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Canje parcial de gramos por esencia (menos de 13g).
   *
   * Pasos:
   * 1. Verificar que el usuario puede canjear (totalPurchases >= 5).
   * 2. Validar que gramsToRedeem >= 1 y <= currentGrams.
   * 3. Descontar gramos atomicamente de la billetera.
   * 4. Registrar transaccion con sourceType=REDEMPTION.
   * 5. Crear EssenceRedemption con ozRedeemed = gramsToRedeem / 13.0.
   *
   * @param userId         - UUID del usuario.
   * @param gramsToRedeem  - Gramos a canjear (1 a currentGrams).
   * @param essenceName    - Nombre de la esencia elegida.
   * @param essenceId      - ID opcional de la esencia del catalogo.
   * @throws AppError 403 si totalPurchases < 5.
   * @throws AppError 400 si gramos invalidos o insuficientes.
   */
  async redeemPartialGrams(
    userId: string,
    gramsToRedeem: number,
    essenceName: string,
    essenceId?: string
  ): Promise<EssenceRedemption> {
    // Paso 1: Verificar elegibilidad para canjear
    const canRedeemNow = await this.canRedeem(userId);
    if (!canRedeemNow) {
      throw AppError.forbidden(
        `Necesitas al menos ${MIN_PURCHASES_TO_REDEEM} compras entregadas para canjear gramos.`
      );
    }

    // Paso 2: Validar cantidad de gramos
    const account = await this.getOrCreateAccount(userId);
    if (gramsToRedeem < 1) {
      throw AppError.badRequest("Debes canjear al menos 1 gramo.");
    }
    if (gramsToRedeem > account.currentGrams) {
      throw AppError.badRequest(
        `Solo tienes ${account.currentGrams}g disponibles. No puedes canjear ${gramsToRedeem}g.`
      );
    }

    // Paso 3: Descontar gramos atomicamente
    await this.gramRepo.updateAccountGrams(account.id!, -gramsToRedeem);

    // Paso 4: Registrar la transaccion de canje
    await this.gramRepo.addTransaction({
      accountId:   account.id!,
      sourceType:  GramSourceType.REDEMPTION,
      gramsDelta:  -gramsToRedeem,
      description: `Canje parcial: ${gramsToRedeem}g por "${essenceName}"`,
    });

    // Paso 5: Crear el registro de canje con onzas proporcionales
    const ozRedeemed = gramsToRedeem / GRAMS_PER_OZ;
    const redemption = await this.essenceRedemptionRepo.create({
      userId,
      gramsUsed:  gramsToRedeem,
      ozRedeemed,
      essenceName,
      essenceId,
    });

    logger.info("Canje parcial de gramos realizado", {
      userId,
      gramsToRedeem,
      ozRedeemed,
      essenceName,
      redemptionId: redemption.id,
    });

    return redemption;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // canRedeem
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica si el usuario puede canjear gramos.
   * Retorna true solo si la billetera tiene al menos MIN_PURCHASES_TO_REDEEM (5)
   * compras entregadas registradas.
   * @param userId - UUID del usuario.
   */
  async canRedeem(userId: string): Promise<boolean> {
    const account = await this.gramRepo.findAccountByUserId(userId);
    if (!account) return false;
    return account.totalPurchases >= MIN_PURCHASES_TO_REDEEM;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // getAccountSummary
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene el resumen completo de la billetera de gramos del usuario.
   * Incluye: billetera, si puede canjear, historial reciente y canjes pendientes.
   * @param userId - UUID del usuario.
   */
  async getAccountSummary(userId: string): Promise<{
    account: GramAccount;
    canRedeem: boolean;
    history: GramTransaction[];
    pendingRedemptions: number;
  }> {
    const account = await this.getOrCreateAccount(userId);
    const canRedeemNow = account.totalPurchases >= MIN_PURCHASES_TO_REDEEM;
    const { transactions: history } = await this.gramRepo.getTransactionHistory(account.id!, 1, 20);
    const stats = await this.gramRepo.getAccountWithStats(userId);
    const pendingRedemptions = stats?.pendingRedemptions ?? 0;

    return {
      account,
      canRedeem: canRedeemNow,
      history,
      pendingRedemptions,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // adminAdjustGrams
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Ajuste manual de gramos por parte del administrador.
   * Crea una transaccion con sourceType=ADMIN_ADJUSTMENT.
   *
   * Validaciones:
   * - Si delta negativo haria el balance < 0: lanza AppError 400.
   * - Si delta positivo haria el balance > 13: capea en 13 con log de advertencia.
   *
   * @param userId  - UUID del usuario.
   * @param delta   - Gramos a sumar (positivo) o restar (negativo).
   * @param reason  - Descripcion del ajuste.
   * @param adminId - UUID del admin que realiza el ajuste.
   * @throws AppError 400 si el balance resultante seria negativo.
   */
  async adminAdjustGrams(
    userId: string,
    delta: number,
    reason: string,
    adminId: string
  ): Promise<GramAccount> {
    const account = await this.getOrCreateAccount(userId);

    // Validar que el balance no quede negativo
    if (account.currentGrams + delta < 0) {
      throw AppError.badRequest(
        `El usuario tiene ${account.currentGrams}g. No se pueden restar ${Math.abs(delta)}g.`
      );
    }

    // Capear en MAX_GRAMS si excede el tope
    let actualDelta = delta;
    if (account.currentGrams + delta > MAX_GRAMS) {
      actualDelta = MAX_GRAMS - account.currentGrams;
      logger.warn("adminAdjustGrams: delta capeado al maximo", {
        userId,
        requestedDelta: delta,
        actualDelta,
        adminId,
      });
    }

    // Actualizar gramos atomicamente
    const updated = await this.gramRepo.updateAccountGrams(account.id!, actualDelta);

    // Registrar la transaccion de ajuste
    await this.gramRepo.addTransaction({
      accountId:   account.id!,
      sourceType:  GramSourceType.ADMIN_ADJUSTMENT,
      gramsDelta:  actualDelta,
      description: `Ajuste admin: ${reason}`,
      referenceId: adminId,
    });

    logger.info("Ajuste admin de gramos", {
      userId,
      delta: actualDelta,
      reason,
      adminId,
      newBalance: updated.currentGrams,
    });

    return updated;
  }
}
