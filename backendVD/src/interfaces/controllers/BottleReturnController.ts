/**
 * Controlador de devoluciones de frascos.
 * Permite a un cliente registrar la devolucion de un frasco
 * y consultar su historial de devoluciones.
 */

// Request, Response, NextFunction - Tipos base de Express.
import { Request, Response, NextFunction } from "express";

// ProcessBottleReturnUseCase - Caso de uso que orquesta la devolucion.
import { ProcessBottleReturnUseCase } from "../../application/usecases/ProcessBottleReturnUseCase";

// IBottleReturnRepository - Para consultar historial de devoluciones.
import { IBottleReturnRepository } from "../../domain/repositories/IBottleReturnRepository";

// param - Helper de Express 5.
import { param } from "../../utils/param";

// AppError - Para verificar propiedad del recurso.
import { AppError } from "../../utils/AppError";

export class BottleReturnController {
  constructor(
    private readonly processReturnUseCase: ProcessBottleReturnUseCase,
    private readonly bottleReturnRepo: IBottleReturnRepository
  ) {}

  /** POST /bottle-returns - Registra una devolucion (userId viene del JWT). */
  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId!;
      const result = await this.processReturnUseCase.execute({
        userId,
        bottleId: req.body.bottleId,
        notes: req.body.notes,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /bottle-returns/user/:userId - Historial de devoluciones de un usuario.
   * Si se proporciona un userId en la URL, solo ADMIN puede consultar devoluciones
   * de otros usuarios. Si no hay userId en la URL, usa el del JWT.
   */
  getByUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const requesterRole = req.userRole ?? "";
      const paramUserId = param(req, "userId");

      // Si el param existe y no es ADMIN, verificar que coincide con el JWT
      if (paramUserId && requesterRole !== "ADMIN" && paramUserId !== req.userId) {
        throw AppError.forbidden("You can only view your own bottle returns.");
      }

      const userId = paramUserId || req.userId!;
      const returns = await this.bottleReturnRepo.findByUserId(userId);
      res.json({ success: true, data: returns });
    } catch (error) {
      next(error);
    }
  };
}
