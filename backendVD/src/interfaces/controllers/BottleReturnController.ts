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
      const userId = (req as any).userId;
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

  /** GET /bottle-returns/user/:userId - Historial de devoluciones de un usuario. */
  getByUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = param(req, "userId") || (req as any).userId;
      const returns = await this.bottleReturnRepo.findByUserId(userId);
      res.json({ success: true, data: returns });
    } catch (error) {
      next(error);
    }
  };
}
