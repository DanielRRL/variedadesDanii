/**
 * Rutas de favoritos de usuario.
 * GET  /favorites/items — Favoritos con datos completos de producto/esencia
 * POST /favorites       — Toggle favorito (crear/borrar)
 * GET  /favorites       — Listar favoritos del usuario (solo IDs)
 */

import { Router } from "express";
import { body } from "express-validator";
import { FavoriteController } from "../controllers/FavoriteController";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../validators/validate";

export const createFavoriteRoutes = (favoriteController: FavoriteController): Router => {
  const router = Router();

  router.use(authMiddleware);

  router.get("/items", favoriteController.getFavoriteItems);
  router.get("/", favoriteController.getMyFavorites);
  router.post(
    "/",
    body("essenceId").optional().isUUID(),
    body("productId").optional().isUUID(),
    validate,
    favoriteController.toggleFavorite
  );

  return router;
};
