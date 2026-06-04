/**
 * FavoriteController — Toggle, listado y items hidratados de favoritos del usuario autenticado.
 *
 * POST /api/favorites       — { essenceId? / productId? } toggle (si existe lo borra, si no lo crea)
 * GET  /api/favorites       — lista de favoritos del usuario (solo IDs)
 * GET  /api/favorites/items — favoritos con datos completos de producto/esencia
 */

import { Request, Response, NextFunction } from "express";
import prisma from "../../config/database";

export class FavoriteController {
  /**
   * GET /api/favorites — Lista los favoritos del usuario autenticado.
   */
  getMyFavorites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "No autorizado" });
        return;
      }

      const favorites = await prisma.userFavorite.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      res.json({ success: true, data: favorites });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/favorites — Toggle: si existe lo borra, si no lo crea.
   * Body: { essenceId?: string, productId?: string }
   * Debe enviarse exactamente uno de los dos.
   */
  toggleFavorite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "No autorizado" });
        return;
      }

      const { essenceId, productId } = req.body;

      if (!essenceId && !productId) {
        res.status(400).json({ success: false, message: "Debe enviar essenceId o productId" });
        return;
      }

      const where: any = { userId };
      if (essenceId) where.essenceId = essenceId;
      if (productId) where.productId = productId;

      const existing = await prisma.userFavorite.findFirst({ where });

      if (existing) {
        await prisma.userFavorite.delete({ where: { id: existing.id } });
        res.json({ success: true, data: { favorited: false, id: existing.id } });
      } else {
        const created = await prisma.userFavorite.create({
          data: { userId, essenceId: essenceId || null, productId: productId || null },
        });
        res.status(201).json({ success: true, data: { favorited: true, id: created.id } });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/favorites/items — Favoritos con datos completos de producto y esencia.
   * Retorna { products: Product[], essences: Essence[] } listos para renderizar.
   */
  getFavoriteItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "No autorizado" });
        return;
      }

      const favorites = await prisma.userFavorite.findMany({
        where: { userId },
      });

      const essenceIds = favorites
        .filter((f) => f.essenceId != null)
        .map((f) => f.essenceId!);
      const productIds = favorites
        .filter((f) => f.productId != null)
        .map((f) => f.productId!);

      const [products, essences] = await Promise.all([
        productIds.length > 0
          ? prisma.product.findMany({
              where: { id: { in: productIds }, active: true },
            })
          : [],
        essenceIds.length > 0
          ? prisma.essence.findMany({
              where: { id: { in: essenceIds }, active: true },
              include: {
                olfactiveFamily: { select: { id: true, name: true } },
              },
            })
          : [],
      ]);

      res.json({ success: true, data: { products, essences } });
    } catch (error) {
      next(error);
    }
  };
}
