/**
 * Rutas de favoritos de usuario.
 * GET  /favorites/items — Favoritos con datos completos de producto/esencia
 * POST /favorites       — Toggle favorito (crear/borrar)
 * GET  /favorites       — Listar favoritos del usuario (solo IDs)
 */

import { Router } from "express";
import { FavoriteController } from "../controllers/FavoriteController";
import { authMiddleware } from "../middleware/authMiddleware";

export const createFavoriteRoutes = (favoriteController: FavoriteController): Router => {
  const router = Router();

  router.use(authMiddleware);

  router.get("/items", favoriteController.getFavoriteItems);
  router.get("/", favoriteController.getMyFavorites);
  router.post("/", favoriteController.toggleFavorite);

  return router;
};
