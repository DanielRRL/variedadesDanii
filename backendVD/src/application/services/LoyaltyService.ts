/**
 * Servicio de Fidelizacion (Loyalty).
 * Centraliza toda la logica de negocio del programa de puntos:
 * acumulacion, canje, niveles y descuentos.
 * Sigue el principio de inversion de dependencias (DIP):
 * depende de interfaces, no de implementaciones concretas.
 */

// ILoyaltyRepository - Contrato de persistencia para cuentas y transacciones.
import { ILoyaltyRepository } from "../../domain/repositories/ILoyaltyRepository";

// IUserRepository - Para consultar datos del usuario (nivel de ordenes, email).
import { IUserRepository } from "../../domain/repositories/IUserRepository";

// IEmailService - Para enviar correo de subida de nivel.
import { IEmailService } from "./IEmailService";

// LoyaltyAccount, LoyaltyLevel - Entidad y enum del dominio de fidelizacion.
import { LoyaltyAccount, LoyaltyLevel } from "../../domain/entities/LoyaltyAccount";

// LoyaltyTransaction, LoyaltyTxType - Entidad y enum de movimientos de puntos.
import { LoyaltyTransaction, LoyaltyTxType } from "../../domain/entities/LoyaltyTransaction";

// AppError - Errores HTTP personalizados.
import { AppError } from "../../utils/AppError";

// logger - Logger centralizado Winston.
import logger from "../../utils/logger";

// ---------------------------------------------------------------------------
// Constantes de reglas de negocio del programa de fidelizacion
// ---------------------------------------------------------------------------

/** Puntos ganados por cada peso colombiano (COP $1) gastado en una orden. */
export const POINTS_PER_PESO = 1;

/** Bonus de puntos por ser la primera compra entregada del cliente. */
export const FIRST_PURCHASE_BONUS = 500;

/** Bonus de puntos por cada devolucion de frasco procesada. */
export const BOTTLE_RETURN_BONUS = 200;

/** Bonus de puntos otorgado a ambas partes cuando se usa un codigo de referido. */
export const REFERRAL_BONUS = 150;

/** Cantidad de ordenes DELIVERED necesarias para alcanzar el nivel PREFERRED. */
export const PREFERRED_THRESHOLD = 5;

/** Cantidad de ordenes DELIVERED necesarias para alcanzar el nivel VIP. */
export const VIP_THRESHOLD = 10;

/** Cantidad de ordenes DELIVERED necesarias para alcanzar el nivel ELITE. */
export const ELITE_THRESHOLD = 20;

// ---------------------------------------------------------------------------
// Mapa de nivel -> porcentaje de descuento activo
// ---------------------------------------------------------------------------

/** Porcentaje de descuento adicional por nivel de fidelizacion. */
const DISCOUNT_BY_LEVEL: Record<LoyaltyLevel, number> = {
  [LoyaltyLevel.BASIC]:     0,
  [LoyaltyLevel.PREFERRED]: 5,
  [LoyaltyLevel.VIP]:       10,
  [LoyaltyLevel.ELITE]:     15,
};

/** Orden de niveles para comparar si hubo una subida. */
const LEVEL_ORDER: LoyaltyLevel[] = [
  LoyaltyLevel.BASIC,
  LoyaltyLevel.PREFERRED,
  LoyaltyLevel.VIP,
  LoyaltyLevel.ELITE,
];

export class LoyaltyService {
  /**
   * Recibe repositorios y servicio de email via inyeccion de dependencias.
   * @param loyaltyRepo  - Repositorio de cuentas y transacciones de puntos.
   * @param userRepo     - Repositorio de usuarios (para contar ordenes y obtener datos).
   * @param emailService - Servicio de correo para notificaciones de nivel.
   */
  constructor(
    private readonly loyaltyRepo: ILoyaltyRepository,
    private readonly userRepo: IUserRepository,
    private readonly emailService: IEmailService,
  ) {}

  /**
   * Obtiene la cuenta de fidelizacion del usuario o la crea si no existe.
   * Garantiza que cada cliente siempre tenga una cuenta disponible.
   * @param userId - UUID del usuario.
   * @returns La cuenta de fidelizacion existente o recien creada.
   */
  async getOrCreateAccount(userId: string): Promise<LoyaltyAccount> {
    const existing = await this.loyaltyRepo.findAccountByUserId(userId);
    if (existing) {
      return existing;
    }
    const created = await this.loyaltyRepo.createAccount({ userId });
    logger.info("Loyalty account created", { userId });
    return created;
  }

  /**
   * Acredita puntos a la cuenta del usuario y evalua si aplica una subida de nivel.
   * Primero garantiza que exista cuenta, luego actualiza el saldo y registra la
   * transaccion de tipo EARN. Finalmente llama a checkAndUpgradeLevel para evaluar
   * cambios de nivel segun el historial de ordenes entregadas.
   * @param userId        - UUID del usuario que acumula los puntos.
   * @param data.points   - Cantidad de puntos a acreditar (debe ser > 0).
   * @param data.reason   - Descripcion legible del motivo de la acumulacion.
   * @param data.referenceId - ID opcional de la orden o accion que genero los puntos.
   * @throws AppError 400 si points <= 0.
   */
  async earnPoints(
    userId: string,
    data: { points: number; reason: string; referenceId?: string }
  ): Promise<void> {
    if (data.points <= 0) {
      throw AppError.badRequest("Points to earn must be a positive integer.");
    }

    // Obtener o crear la cuenta del usuario
    const account = await this.getOrCreateAccount(userId);

    // Actualizar saldo de puntos
    const newPoints = account.points + data.points;
    const updated = await this.loyaltyRepo.updateAccount(account.id!, {
      points: newPoints,
    });

    // Registrar transaccion de acumulacion
    await this.loyaltyRepo.addTransaction({
      accountId:   account.id!,
      type:        LoyaltyTxType.EARN,
      points:      data.points,
      reason:      data.reason,
      referenceId: data.referenceId,
    });

    logger.info("Points earned", { userId, points: data.points, reason: data.reason });

    // Evaluar y ejecutar subida de nivel si corresponde
    const deliveredCount = await this.userRepo.countOrdersByUser(userId);
    await this.checkAndUpgradeLevel(updated, deliveredCount);
  }

  /**
   * Canjea puntos de la cuenta del usuario como descuento en una orden.
   * Valida que el saldo sea suficiente antes de deducir.
   * Registra una transaccion de tipo REDEEM.
   * @param userId         - UUID del usuario que canjea puntos.
   * @param data.points    - Cantidad de puntos a canjear (debe ser > 0).
   * @param data.orderId   - UUID de la orden en la que se aplica el canje.
   * @throws AppError 400 si points <= 0.
   * @throws AppError 400 si el saldo es insuficiente.
   * @throws AppError 404 si el usuario no tiene cuenta de fidelizacion.
   */
  async redeemPoints(
    userId: string,
    data: { points: number; orderId: string }
  ): Promise<void> {
    if (data.points <= 0) {
      throw AppError.badRequest("Points to redeem must be a positive integer.");
    }

    const account = await this.loyaltyRepo.findAccountByUserId(userId);
    if (!account) {
      throw AppError.notFound("Loyalty account not found for this user.");
    }

    if (account.points < data.points) {
      throw AppError.badRequest(
        `Insufficient points. Available: ${account.points}, Requested: ${data.points}.`
      );
    }

    // Deducir puntos del saldo
    await this.loyaltyRepo.updateAccount(account.id!, {
      points: account.points - data.points,
    });

    // Registrar transaccion de canje (puntos negativos por convencion)
    await this.loyaltyRepo.addTransaction({
      accountId:   account.id!,
      type:        LoyaltyTxType.REDEEM,
      points:      -data.points,
      reason:      `Puntos canjeados como descuento en orden`,
      referenceId: data.orderId,
    });

    logger.info("Points redeemed", { userId, points: data.points, orderId: data.orderId });
  }

  /**
   * Evalua si la cuenta debe subir de nivel segun la cantidad de ordenes entregadas.
   * Determina el nivel destino con los umbrales definidos en las constantes.
   * Si hay una subida, actualiza el nivel y el porcentaje de descuento, y envia
   * un correo de felicitacion al cliente.
   * No hace nada si el nivel ya es el correcto.
   * @param account              - Cuenta de fidelizacion actual del usuario.
   * @param deliveredOrderCount  - Total de ordenes con status DELIVERED del usuario.
   */
  async checkAndUpgradeLevel(
    account: LoyaltyAccount,
    deliveredOrderCount: number
  ): Promise<void> {
    // Determinar el nivel al que corresponde segun ordenes entregadas
    let targetLevel: LoyaltyLevel;
    if (deliveredOrderCount >= ELITE_THRESHOLD) {
      targetLevel = LoyaltyLevel.ELITE;
    } else if (deliveredOrderCount >= VIP_THRESHOLD) {
      targetLevel = LoyaltyLevel.VIP;
    } else if (deliveredOrderCount >= PREFERRED_THRESHOLD) {
      targetLevel = LoyaltyLevel.PREFERRED;
    } else {
      targetLevel = LoyaltyLevel.BASIC;
    }

    // Si el nivel ya es el correcto, no hay nada que hacer
    if (account.level === targetLevel) {
      return;
    }

    const currentIndex = LEVEL_ORDER.indexOf(account.level);
    const targetIndex  = LEVEL_ORDER.indexOf(targetLevel);

    // Solo actualizamos si es una subida (nunca bajamos de nivel)
    if (targetIndex <= currentIndex) {
      return;
    }

    const newDiscountPct = DISCOUNT_BY_LEVEL[targetLevel];

    // Actualizar cuenta con nuevo nivel y descuento
    await this.loyaltyRepo.updateAccount(account.id!, {
      level:       targetLevel,
      discountPct: newDiscountPct,
    });

    logger.info("Loyalty level upgraded", {
      userId:   account.userId,
      from:     account.level,
      to:       targetLevel,
      discount: newDiscountPct,
    });

    // Enviar correo de felicitacion por subida de nivel
    const user = await this.userRepo.findById(account.userId);
    if (user) {
      await this.emailService.sendLoyaltyLevelUp(user.email, {
        clientName:  user.name,
        newLevel:    targetLevel,
        discountPct: newDiscountPct,
      });
    }
  }

  /**
   * Calcula la cantidad de puntos que debe ganar el cliente por una orden.
   * Aplica la regla POINTS_PER_PESO: 1 punto por cada peso COP gastado.
   * @param orderTotal - Monto total de la orden en pesos colombianos.
   * @returns Puntos enteros a acreditar (floor del calculo).
   */
  calculatePointsForOrder(orderTotal: number): number {
    return Math.floor(orderTotal * POINTS_PER_PESO);
  }

  /**
   * Retorna el resumen de la cuenta de fidelizacion con las transacciones recientes.
   * Si el usuario no tiene cuenta, la crea antes de retornar.
   * @param userId - UUID del usuario.
   * @returns Objeto con la cuenta y el historial de transacciones (pagina 1, 20 items).
   */
  async getAccountSummary(userId: string): Promise<{
    account: LoyaltyAccount;
    transactions: LoyaltyTransaction[];
  }> {
    const account = await this.getOrCreateAccount(userId);
    const transactions = await this.loyaltyRepo.getTransactionsByAccount(
      account.id!,
      1,
      20
    );
    return { account, transactions };
  }

  /**
   * Realiza un ajuste manual de puntos por parte de un administrador.
   * Permite acreditar (points > 0) o debitar (points < 0) puntos.
   * Siempre registra la transaccion de tipo ADJUST con el motivo dado.
   * Si points es negativo, valida que el saldo sea suficiente.
   * @param userId   - UUID del usuario cuya cuenta se ajusta.
   * @param points   - Puntos a ajustar (positivo = credito, negativo = debito).
   * @param reason   - Motivo del ajuste (documentado en la transaccion).
   * @param adminId  - UUID del administrador que realiza el ajuste (para trazabilidad).
   * @throws AppError 404 si el usuario no tiene cuenta de fidelizacion.
   * @throws AppError 400 si el ajuste es negativo y el saldo es insuficiente.
   */
  async adjustPoints(
    userId: string,
    points: number,
    reason: string,
    adminId: string
  ): Promise<void> {
    const account = await this.loyaltyRepo.findAccountByUserId(userId);
    if (!account) {
      throw AppError.notFound("Loyalty account not found for this user.");
    }

    const newBalance = account.points + points;
    if (newBalance < 0) {
      throw AppError.badRequest(
        `Insufficient points for debit adjustment. Available: ${account.points}, Requested debit: ${Math.abs(points)}.`
      );
    }

    await this.loyaltyRepo.updateAccount(account.id!, { points: newBalance });

    await this.loyaltyRepo.addTransaction({
      accountId: account.id!,
      type:      LoyaltyTxType.ADJUST,
      points,
      reason:    `[Admin ${adminId}] ${reason}`,
    });

    logger.info("Points adjusted by admin", { userId, points, reason, adminId });
  }

  /**
   * Retorna las transacciones paginadas de la cuenta del usuario.
   * @param userId - UUID del usuario.
   * @param page   - Pagina solicitada (base 1).
   * @param limit  - Registros por pagina.
   * @returns Array de transacciones ordenadas por fecha descendente.
   * @throws AppError 404 si el usuario no tiene cuenta.
   */
  async getTransactions(
    userId: string,
    page: number,
    limit: number
  ): Promise<LoyaltyTransaction[]> {
    const account = await this.loyaltyRepo.findAccountByUserId(userId);
    if (!account) {
      throw AppError.notFound("Loyalty account not found for this user.");
    }
    return this.loyaltyRepo.getTransactionsByAccount(account.id!, page, limit);
  }
}
