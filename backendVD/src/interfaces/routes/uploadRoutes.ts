/**
 * Upload routes — file upload for product/essence images.
 *
 * POST /api/admin/upload  (ADMIN only)
 * Accepts multipart/form-data with a single file field "image".
 * Saves to /app/uploads/ and returns the URL.
 *
 * Multer config:
 *  - Max file size: 5 MB
 *  - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif, image/avif
 *  - Files renamed to: {timestamp}-{random}.{ext}
 */

import { Router } from "express";
import multer from "multer";
import { randomBytes } from "crypto";
import path from "path";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const UPLOAD_DIR = path.resolve(__dirname, "../../../uploads");

const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const name = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido. Usar: ${ALLOWED_MIMES.join(", ")}`));
    }
  },
});

export function createUploadRoutes(): Router {
  const router = Router();

  // POST /api/admin/upload — subir una imagen
  router.post(
    "/",
    authMiddleware,
    roleMiddleware("ADMIN"),
    (req, res, next) => {
      upload.single("image")(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              success: false,
              message: "El archivo excede el tamaño máximo de 5 MB",
            });
          }
          return res.status(400).json({
            success: false,
            message: err.message || "Error al subir el archivo",
          });
        }

        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "No se recibió ningún archivo. Usar campo 'image'",
          });
        }

        const url = `/uploads/${req.file.filename}`;
        res.status(201).json({
          success: true,
          data: { url, filename: req.file.filename, size: req.file.size },
        });
      });
    },
  );

  return router;
}
