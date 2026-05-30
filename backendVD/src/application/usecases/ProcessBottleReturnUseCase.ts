/**
 * Caso de uso: Procesar Devolucion de Frasco.
 * Cuando un cliente devuelve un frasco para reutilizacion:
 * 1. Valida que el frasco exista.
 * 2. Registra un movimiento de entrada (IN) en inventario.
 * 3. Crea el registro de devolucion con el descuento del 10%.
 */

// IBottleReturnRepository - Para persistir el registro de devolucion.
import { IBottleReturnRepository } from "../../domain/repositories/IBottleReturnRepository";

// IBottleRepository - Para validar que el frasco existe.
import { IBottleRepository } from "../../domain/repositories/IBottleRepository";

// InventoryService - Para registrar el frasco devuelto como entrada de inventario.
import { InventoryService } from "../services/InventoryService";

// AppError - Errores HTTP (notFound si el frasco no existe).
import { AppError } from "../../utils/AppError";

// logger - Para registrar la devolucion exitosa.
import logger from "../../utils/logger";

// prisma - Para envolver registro de inventario y devolucion en transaccion atomica.
import prisma from "../../config/database";

/** Datos de entrada para procesar una devolucion. */
export interface ProcessBottleReturnInput {
  userId: string;
  bottleId: string;
  notes?: string;
}

/** Porcentaje de descuento otorgado por devolver un frasco. */
const BOTTLE_RETURN_DISCOUNT_PERCENT = 10;

export class ProcessBottleReturnUseCase {
  /** Recibe repos necesarios y servicio de inventario via DI. */
  constructor(
    private readonly bottleReturnRepo: IBottleReturnRepository,
    private readonly bottleRepo: IBottleRepository,
    private readonly inventoryService: InventoryService
  ) {}

  /**
   * Ejecuta la devolucion de frasco.
   * Retorna el registro creado, porcentaje de descuento y mensaje para el cliente.
   */
  async execute(input: ProcessBottleReturnInput): Promise<any> {
    // Paso 1: Validar que el frasco existe
    const bottle = await this.bottleRepo.findById(input.bottleId);
    if (!bottle) {
      throw AppError.notFound("Bottle not found");
    }

    // Paso 2-3: Registrar entrada de inventario y crear devolucion en transaccion atomica.
    // Si cualquiera de las dos operaciones falla, la otra se revierte.
    const bottleReturn = await prisma.$transaction(async (tx) => {
      await tx.bottleMovement.create({
        data: {
          bottleId: input.bottleId,
          type: "IN" as any,
          quantity: 1,
          reason: "RETURN" as any,
          reference: `return:${input.userId}`,
        },
      });

      return tx.bottleReturn.create({
        data: {
          userId: input.userId,
          bottleId: input.bottleId,
          discountApplied: BOTTLE_RETURN_DISCOUNT_PERCENT,
          notes: input.notes,
        },
      });
    });

    logger.info(
      `Bottle return processed: user ${input.userId}, bottle ${input.bottleId}, discount ${BOTTLE_RETURN_DISCOUNT_PERCENT}%`
    );

    return {
      bottleReturn,
      discountForNextOrder: BOTTLE_RETURN_DISCOUNT_PERCENT,
      message: `Frasco devuelto. Descuento del ${BOTTLE_RETURN_DISCOUNT_PERCENT}% aplicable en tu proximo pedido.`,
    };
  }
}
